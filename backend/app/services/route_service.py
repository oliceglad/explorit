import uuid
from types import SimpleNamespace
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, bindparam, String
from sqlalchemy.dialects.postgresql import ARRAY

from app.models.poi import POI
from app.models.event import Event
from app.models.route import Route
from app.models.interaction import Interaction
from app.algorithms.nearest_neighbor import nearest_neighbor
from app.algorithms.two_opt import two_opt
from app.algorithms.clustering import cluster_points
from app.algorithms.collaborative_filter import get_cf_boost
from app.algorithms.point_generator import generate_random_point
from app.services.scoring_service import score_and_rank
from app.algorithms.astar import build_path


async def get_poi_in_radius(
    lat: float,
    lon: float,
    radius_km: float,
    categories: list[str] | None,
    limit: int,
    db: AsyncSession,
) -> list[POI]:
    radius_m = radius_km * 1000
    query = text(
        """
        SELECT id FROM poi
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
            :radius_m
        )
        AND is_active = true
        AND (cardinality(:categories) = 0 OR category = ANY(:categories))
        LIMIT :limit
        """
    ).bindparams(bindparam("categories", type_=ARRAY(String)))

    result = await db.execute(query, {
        "lat": lat, "lon": lon,
        "radius_m": radius_m,
        "categories": categories or [],
        "limit": limit,
    })
    ids = [row[0] for row in result.fetchall()]
    if not ids:
        return []
    pois = await db.execute(select(POI).where(POI.id.in_(ids)))
    return list(pois.scalars().all())


async def generate_route(
    lat: float,
    lon: float,
    radius_km: float,
    max_points: int,
    categories: list[str] | None,
    transport_mode: str,
    max_duration_min: int,
    user_id: str,
    db: AsyncSession,
    redis_client: Any,
    waypoints: list[dict] | None = None,
    surprise_me: bool = False,
) -> Route:
    pois = await get_poi_in_radius(lat, lon, radius_km, categories, 80, db)

    if not pois:
        from app.services.geo_service import fetch_overpass_pois
        raw = await fetch_overpass_pois(lat, lon, radius_km, categories, redis_client, db)
        pois = [
            SimpleNamespace(
                id=uuid.uuid4(),
                name=p["name"],
                category=p["category"],
                lat=p["lat"],
                lon=p["lon"],
                rating=0.0,
            )
            for p in raw
        ]

    visited_result = await db.execute(
        select(Interaction.poi_id, Interaction.id)
        .where(Interaction.user_id == uuid.UUID(user_id))
    )
    visited_ids: dict[str, int] = {}
    for row in visited_result.fetchall():
        pid = str(row[0])
        visited_ids[pid] = visited_ids.get(pid, 0) + 1

    events_result = await db.execute(select(Event).where(Event.is_active == True))
    events = list(events_result.scalars().all())

    from app.models.user import User
    user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = user_result.scalar_one()

    # ── Step 1: base scoring ──────────────────────────────────────────────────
    scored = score_and_rank(pois, events, user.interests, visited_ids)

    pool_size = max(max_points * 3, max_points + 8)
    pool = scored[:pool_size]

    # ── Step 2: collaborative filtering boost ─────────────────────────────────
    try:
        poi_ids_for_cf = [str(p.id) for p, _ in pool]
        cf_boosts = await get_cf_boost(user_id, poi_ids_for_cf, db, redis_client)
        pool = [(p, s + cf_boosts.get(str(p.id), 0.0)) for p, s in pool]
        pool.sort(key=lambda x: x[1], reverse=True)
    except Exception:
        pass  # CF boost is optional, never block route generation

    # ── Step 3: geographic clustering for variety ─────────────────────────────
    if len(pool) >= max_points:
        points_for_cluster = [
            {"lat": p.lat, "lon": p.lon, "idx": i}
            for i, (p, _) in enumerate(pool)
        ]
        n_clusters = min(max_points, len(pool))
        clusters = cluster_points(points_for_cluster, n_clusters=n_clusters)

        selected: list[tuple[Any, float]] = []
        for cluster in clusters:
            if not cluster:
                continue
            best_item = max(cluster, key=lambda x: pool[x["idx"]][1])
            selected.append(pool[best_item["idx"]])
    else:
        selected = pool

    points_raw = [
        {"lat": p.lat, "lon": p.lon, "id": str(p.id), "score": s, "name": p.name, "is_surprise": False}
        for p, s in selected
    ]

    # ── Step 4: forced waypoints ──────────────────────────────────────────────
    if waypoints:
        wp_set = {w["id"] for w in waypoints}
        points_raw = [p for p in points_raw if p["id"] not in wp_set]
        forced = [
            {"lat": w["lat"], "lon": w["lon"], "id": w["id"], "score": 9999.0,
             "name": w["name"], "is_surprise": False}
            for w in waypoints
        ]
        remaining_slots = max(0, max_points - len(forced))
        points_raw = forced + points_raw[:remaining_slots]

    # ── Step 5: surprise point ────────────────────────────────────────────────
    if surprise_me:
        try:
            s_lat, s_lon = await generate_random_point(lat, lon, radius_km)
            points_raw.append({
                "lat": s_lat,
                "lon": s_lon,
                "id": str(uuid.uuid4()),
                "score": 0.0,
                "name": "Секретное место",
                "is_surprise": True,
            })
        except Exception:
            pass

    # ── Step 6: route ordering ────────────────────────────────────────────────
    ordered = nearest_neighbor(lat, lon, points_raw)
    optimized = two_opt(ordered)

    route_points = [
        {
            "order": i + 1,
            "poi_id": p["id"],
            "lat": p["lat"],
            "lon": p["lon"],
            "name": p["name"],
            "is_surprise": p.get("is_surprise", False),
        }
        for i, p in enumerate(optimized)
    ]

    # ── Step 7: road polyline via OSRM ────────────────────────────────────────
    total_distance = 0.0
    full_polyline: list[list[float]] = []
    coords = [(lat, lon)] + [(p["lat"], p["lon"]) for p in optimized]
    for i in range(len(coords) - 1):
        segment = await build_path(coords[i], coords[i + 1], transport_mode, redis_client)
        total_distance += segment["distance_m"]
        seg_pts: list[list[float]] = segment.get("polyline", [])
        if full_polyline and seg_pts:
            full_polyline.extend(seg_pts[1:])
        else:
            full_polyline.extend(seg_pts)

    speed_kmh = 4.5 if transport_mode == "walking" else 30.0
    duration_min = min(int(total_distance / 1000 / speed_kmh * 60), max_duration_min)

    route = Route(
        author_id=uuid.UUID(user_id),
        points=route_points,
        polyline=full_polyline if full_polyline else None,
        distance_m=total_distance,
        duration_min=duration_min,
        transport_mode=transport_mode,
    )
    db.add(route)
    await db.flush()
    return route
