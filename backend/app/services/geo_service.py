import hashlib
import json

import redis.asyncio as aioredis
import httpx

_GEOCODE_TTL = 30 * 86400  # 30 days


async def geocode_address(address: str, api_key: str, redis_client: aioredis.Redis) -> tuple[float, float] | None:
    cache_key = f"geocode:{hashlib.md5(address.encode()).hexdigest()}"
    cached = await redis_client.get(cache_key)
    if cached:
        data = json.loads(cached)
        return data["lat"], data["lon"]

    try:
        result = await _yandex_geocode(address, api_key)
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
