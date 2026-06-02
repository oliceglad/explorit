import json
from typing import Any

from app.algorithms.haversine import haversine
from app.utils.geohash_utils import encode as gh_encode

_CACHE_TTL = 86400  # 24 hours

# OSRM transport mode mapping
_OSRM_PROFILE = {
    "walking": "foot",
    "driving": "car",
    "cycling": "bike",
}


async def build_path(
    start: tuple[float, float],
    end: tuple[float, float],
    transport_mode: str,
    redis_client: Any,
) -> dict:
    """Fetches route with Redis caching. Uses OSRM (free) by default, falls back to straight line."""
    gh_start = gh_encode(start[0], start[1], precision=6)
    gh_end = gh_encode(end[0], end[1], precision=6)
    cache_key = f"routing:{gh_start}:{gh_end}:{transport_mode}"

    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    try:
        result = await _fetch_osrm_route(start, end, transport_mode)
    except Exception:
        result = _straight_line(start, end)

    await redis_client.setex(cache_key, _CACHE_TTL, json.dumps(result))
    return result


async def _fetch_osrm_route(
    start: tuple[float, float],
    end: tuple[float, float],
    mode: str,
) -> dict:
    import httpx

    profile = _OSRM_PROFILE.get(mode, "foot")
    # OSRM expects lon,lat order
    coords = f"{start[1]},{start[0]};{end[1]},{end[0]}"
    url = f"https://router.project-osrm.org/route/v1/{profile}/{coords}"
    params = {"overview": "full", "geometries": "geojson"}

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("OSRM returned no routes")

    route = data["routes"][0]
    distance_m = route["distance"]
    # GeoJSON coordinates are [lon, lat] — convert to [lat, lon]
    polyline = [[pt[1], pt[0]] for pt in route["geometry"]["coordinates"]]

    return {"polyline": polyline, "distance_m": distance_m}


def _straight_line(start: tuple[float, float], end: tuple[float, float]) -> dict:
    distance_m = haversine(start[0], start[1], end[0], end[1])
    return {
        "polyline": [list(start), list(end)],
        "distance_m": distance_m,
    }
