import asyncio
import hashlib
import json
import math
import time
import uuid
from datetime import datetime, timedelta
from typing import Any

import redis.asyncio as aioredis
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from geoalchemy2 import WKTElement

_GEOCODE_TTL = 30 * 86400   # 30 days
_PLACES_TTL = 7 * 86400     # 7 days
_OVERPASS_TTL = 3 * 3600    # 3 hours
_DB_CACHE_TTL_H = 24        # hours before DB data is considered stale
_DB_MIN_POIS = 4            # min POIs per requested category to trust DB cache
_OVERPASS_RATE_S = 2.0      # minimum seconds between Overpass calls

_CATEGORY_OVERPASS: dict[str, list[str]] = {
    "Кафе": ['node["amenity"="cafe"]', 'node["amenity"="restaurant"]', 'node["amenity"="bar"]'],
    "Парки": ['node["leisure"="park"]', 'way["leisure"="park"]', 'node["leisure"="garden"]', 'way["leisure"="garden"]'],
    "Виды": ['node["tourism"="viewpoint"]', 'node["natural"="peak"]'],
    "Архитектура": ['node["tourism"="attraction"]', 'way["tourism"="attraction"]', 'node["historic"="monument"]', 'node["historic"="castle"]'],
    "Музыка": ['node["amenity"="music_venue"]', 'node["amenity"="nightclub"]', 'node["amenity"="theatre"]'],
}

_TAG_TO_CATEGORY: dict[str, dict[str, str]] = {
    "amenity": {"cafe": "Кафе", "restaurant": "Кафе", "bar": "Кафе", "music_venue": "Музыка", "nightclub": "Музыка", "theatre": "Музыка"},
    "leisure": {"park": "Парки", "garden": "Парки", "recreation_ground": "Парки"},
    "tourism": {"viewpoint": "Виды", "attraction": "Архитектура"},
    "natural": {"peak": "Виды"},
    "historic": {"monument": "Архитектура", "castle": "Архитектура"},
}


def _get_category(tags: dict) -> str:
    for key, vals in _TAG_TO_CATEGORY.items():
        v = tags.get(key)
        if v and vals.get(v):
            return vals[v]
    return ""


async def geocode_address(address: str, api_key: str, redis_client: aioredis.Redis) -> tuple[float, float] | None:
    cache_key = f"geocode:{hashlib.md5(address.encode()).hexdigest()}"
    cached = await redis_client.get(cache_key)
    if cached:
        data = json.loads(cached)
        return data["lat"], data["lon"]

    try:
        result = await _yandex_geocode(address, api_key)
    except Exception:
        result = None

    if result is None:
        try:
            result = await _nominatim_geocode(address, redis_client)
        except Exception:
            return None

    if result:
        await redis_client.setex(cache_key, _GEOCODE_TTL, json.dumps({"lat": result[0], "lon": result[1]}))
    return result


async def _yandex_geocode(address: str, api_key: str) -> tuple[float, float] | None:
    url = "https://geocode-maps.yandex.ru/1.x/"
    params = {"apikey": api_key, "geocode": address, "format": "json", "results": 1}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    members = data.get("response", {}).get("GeoObjectCollection", {}).get("featureMember", [])
    if not members:
        return None

    pos = members[0]["GeoObject"]["Point"]["pos"]
    lon_str, lat_str = pos.split()
    return float(lat_str), float(lon_str)


_INTERESTS_MAP: list[tuple[str, str]] = [
    # Кафе
    ("кафе", "Кафе"), ("кофе", "Кафе"), ("ресторан", "Кафе"), ("поесть", "Кафе"),
    ("перекус", "Кафе"), ("завтрак", "Кафе"), ("обед", "Кафе"), ("ужин", "Кафе"),
    ("бар", "Кафе"), ("выпить", "Кафе"), ("гастроном", "Кафе"), ("кухн", "Кафе"),
    ("еда", "Кафе"), ("пицц", "Кафе"), ("суши", "Кафе"),
    # Парки
    ("парк", "Парки"), ("природ", "Парки"), ("зелен", "Парки"), ("сад", "Парки"),
    ("гулять", "Парки"), ("прогулк", "Парки"), ("свежий", "Парки"),
    ("пикник", "Парки"), ("лес", "Парки"), ("река", "Парки"),
    # Виды
    ("вид", "Виды"), ("панорам", "Виды"), ("смотров", "Виды"), ("высот", "Виды"),
    ("фото", "Виды"), ("закат", "Виды"), ("рассвет", "Виды"), ("красив", "Виды"),
    # Архитектура
    ("архитектур", "Архитектура"), ("истори", "Архитектура"), ("собор", "Архитектура"),
    ("церковь", "Архитектура"), ("старый", "Архитектура"), ("памятник", "Архитектура"),
    ("музей", "Архитектура"), ("замок", "Архитектура"), ("достопримечательн", "Архитектура"),
    ("старин", "Архитектура"), ("культур", "Архитектура"),
    # Музыка
    ("музык", "Музыка"), ("концерт", "Музыка"), ("клуб", "Музыка"), ("театр", "Музыка"),
    ("джаз", "Музыка"), ("рок", "Музыка"), ("ночная", "Музыка"), ("вечеринк", "Музыка"),
]


def extract_interests_categories(text: str) -> list[str]:
    lowered = text.lower()
    found: set[str] = set()
    for keyword, category in _INTERESTS_MAP:
        if keyword in lowered:
            found.add(category)
    return sorted(found)


async def _nominatim_geocode(address: str, redis_client: aioredis.Redis) -> tuple[float, float] | None:
    results = await search_places(address, None, None, redis_client)
    if not results:
        return None
    return results[0]["lat"], results[0]["lon"]


async def search_places(
    query: str,
    lat: float | None,
    lon: float | None,
    redis_client: aioredis.Redis,
) -> list[dict[str, Any]]:
    cache_key = f"geo:places:{hashlib.md5(f'{query}:{lat}:{lon}'.encode()).hexdigest()}"
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    params: dict[str, Any] = {"format": "json", "q": query, "limit": 6, "accept-language": "ru"}
    if lat is not None and lon is not None:
        params["viewbox"] = f"{lon - 0.8},{lat - 0.5},{lon + 0.8},{lat + 0.5}"
        params["bounded"] = 0

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params=params,
            headers={"User-Agent": "ExploritApp/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    result = [
        {
            "id": f"{r['lat']},{r['lon']}",
            "name": (r.get("name") or r["display_name"].split(",")[0]).strip(),
            "address": r["display_name"],
            "lat": float(r["lat"]),
            "lon": float(r["lon"]),
        }
        for r in data
    ]
    await redis_client.setex(cache_key, _PLACES_TTL, json.dumps(result))
    return result


async def _wait_overpass_slot(redis_client: aioredis.Redis) -> None:
    """Best-effort 2 s rate-limit between Overpass calls (shared via Redis)."""
    key = "overpass:last_call"
    last = await redis_client.get(key)
    if last:
        elapsed = time.time() - float(last)
        if elapsed < _OVERPASS_RATE_S:
            await asyncio.sleep(_OVERPASS_RATE_S - elapsed)
    await redis_client.set(key, str(time.time()), ex=10)


async def _query_db_pois(
    lat: float, lon: float, radius_km: float,
    cats: list[str], db: AsyncSession,
) -> list[dict[str, Any]]:
    from app.models.poi import POI

    cutoff = datetime.utcnow() - timedelta(hours=_DB_CACHE_TTL_H)
    degree_r = radius_km / 111  # rough degree-radius (good enough for cache check)

    result = await db.execute(
        select(POI).where(
            func.ST_DWithin(
                POI.location,
                func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326),
                degree_r,
            ),
            POI.category.in_(cats),
            POI.fetched_at >= cutoff,
            POI.is_active.is_(True),
        ).limit(60)
    )
    rows = result.scalars().all()
    return [
        {
            "id": poi.external_id or str(poi.id),
            "name": poi.name,
            "category": poi.category,
            "lat": poi.lat,
            "lon": poi.lon,
            "opening_hours": poi.opening_hours,
            "website": poi.website,
            "phone": poi.phone,
            "address": poi.address,
        }
        for poi in rows
    ]


async def _upsert_pois_to_db(pois: list[dict[str, Any]], db: AsyncSession) -> None:
    from app.models.poi import POI

    now = datetime.utcnow()
    rows = [
        {
            "id": uuid.uuid4(),
            "name": p["name"],
            "category": p["category"],
            "lat": p["lat"],
            "lon": p["lon"],
            "location": WKTElement(f'POINT({p["lon"]} {p["lat"]})', srid=4326),
            "address": p.get("address"),
            "opening_hours": p.get("opening_hours"),
            "website": p.get("website"),
            "phone": p.get("phone"),
            "external_id": p["id"],
            "source": "osm",
            "is_active": True,
            "rating": 0.0,
            "fetched_at": now,
            "created_at": now,
            "updated_at": now,
        }
        for p in pois
        if p.get("id")
    ]
    if not rows:
        return

    stmt = pg_insert(POI).values(rows)
    stmt = stmt.on_conflict_do_update(
        constraint="uq_poi_external_id",
        set_={
            "name": stmt.excluded.name,
            "category": stmt.excluded.category,
            "lat": stmt.excluded.lat,
            "lon": stmt.excluded.lon,
            "location": stmt.excluded.location,
            "opening_hours": stmt.excluded.opening_hours,
            "website": stmt.excluded.website,
            "phone": stmt.excluded.phone,
            "address": stmt.excluded.address,
            "fetched_at": stmt.excluded.fetched_at,
            "updated_at": stmt.excluded.updated_at,
        },
    )
    await db.execute(stmt)
    await db.commit()


async def fetch_overpass_pois(
    lat: float,
    lon: float,
    radius_km: float,
    categories: list[str] | None,
    redis_client: aioredis.Redis,
    db: AsyncSession | None = None,
) -> list[dict[str, Any]]:
    cats = categories or list(_CATEGORY_OVERPASS.keys())
    cache_key = f"poi:overpass:{lat:.4f}:{lon:.4f}:{radius_km}:{','.join(sorted(cats))}"

    # ── L1: Redis (3 h) ───────────────────────────────────────────────────────
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # ── L2: PostgreSQL spatial cache (24 h) ───────────────────────────────────
    if db is not None:
        db_pois = await _query_db_pois(lat, lon, radius_km, cats, db)
        if len(db_pois) >= len(cats) * _DB_MIN_POIS:
            await redis_client.setex(cache_key, _OVERPASS_TTL, json.dumps(db_pois))
            return db_pois

    # ── L3: Overpass API (rate-limited) ───────────────────────────────────────
    await _wait_overpass_slot(redis_client)

    lat_d = radius_km / 111
    lon_d = radius_km / (111 * math.cos(math.radians(lat)))
    bbox = f"{lat - lat_d},{lon - lon_d},{lat + lat_d},{lon + lon_d}"

    lines = [
        f"  {tag}({bbox});"
        for cat in cats
        for tag in _CATEGORY_OVERPASS.get(cat, [])
    ]
    query = "[out:json][timeout:15];\n(\n" + "\n".join(lines) + "\n);\nout body center;"

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": query},
            headers={"User-Agent": "ExploritApp/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()

    result: list[dict[str, Any]] = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        if not tags.get("name"):
            continue
        if el["type"] == "node":
            p_lat, p_lon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center") or {}
            p_lat, p_lon = center.get("lat"), center.get("lon")
        if not p_lat or not p_lon:
            continue
        category = _get_category(tags)
        if not category or category not in cats:
            continue
        result.append({
            "id": f"{el['type']}/{el['id']}",
            "name": tags["name"],
            "category": category,
            "lat": p_lat,
            "lon": p_lon,
            "opening_hours": tags.get("opening_hours"),
            "website": tags.get("website") or tags.get("contact:website"),
            "phone": tags.get("phone") or tags.get("contact:phone"),
            "address": " ".join(filter(None, [tags.get("addr:street"), tags.get("addr:housenumber")])) or None,
        })
        if len(result) >= 60:
            break

    # Populate both caches
    await redis_client.setex(cache_key, _OVERPASS_TTL, json.dumps(result))
    if db is not None:
        await _upsert_pois_to_db(result, db)

    return result
