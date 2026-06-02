import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.models.poi import POI
from app.models.event import Event
from app.models.route import Route
from app.models.interaction import Interaction
from app.algorithms.nearest_neighbor import nearest_neighbor
from app.algorithms.two_opt import two_opt
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
        AND (:categories IS NULL OR category = ANY(:categories))
        LIMIT :limit
        """
    )
    result = await db.execute(query, {
        "lat": lat, "lon": lon,
        "radius_m": radius_m,
        "categories": categories,
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
    redis_client: object,
) -> Route:
    pois = await get_poi_in_radius(lat, lon, radius_km, categories, 50, db)

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

    scored = score_and_rank(pois, events, user.interests, visited_ids)

    points_raw = [{"lat": p.lat, "lon": p.lon, "id": str(p.id), "score": s, "name": p.name}
                  for p, s in scored[:max_points]]

    ordered = nearest_neighbor(lat, lon, points_raw)
    optimized = two_opt(ordered)

    route_points = [
        {"order": i + 1, "poi_id": p["id"], "lat": p["lat"], "lon": p["lon"], "name": p["name"]}
        for i, p in enumerate(optimized)
    ]

    total_distance = 0.0
    coords = [(lat, lon)] + [(p["lat"], p["lon"]) for p in optimized]
    for i in range(len(coords) - 1):
        segment = await build_path(coords[i], coords[i + 1], transport_mode, redis_client)
        total_distance += segment["distance_m"]

    # Walking ~4.5 km/h, driving ~30 km/h; cap at max_duration_min
    speed_kmh = 4.5 if transport_mode == "walking" else 30.0
    duration_min = min(int(total_distance / 1000 / speed_kmh * 60), max_duration_min)

    route = Route(
        author_id=uuid.UUID(user_id),
        points=route_points,
        distance_m=total_distance,
        duration_min=duration_min,
        transport_mode=transport_mode,
    )
    db.add(route)
    await db.flush()
    return route
