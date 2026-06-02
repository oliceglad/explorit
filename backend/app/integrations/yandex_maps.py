import httpx
import redis.asyncio as aioredis

from app.integrations.circuit_breaker import circuit_breaker


class YandexMapsClient:
    service_name = "yandex_maps"

    def __init__(self, api_key: str, redis_client: aioredis.Redis | None = None):
        self.api_key = api_key
        self.redis_client = redis_client

    @circuit_breaker(failure_threshold=5, recovery_timeout=60)
    async def get_route(self, start: tuple[float, float], end: tuple[float, float], mode: str) -> dict:
        url = "https://api.routing.yandex.net/v2/route"
        params = {
            "apikey": self.api_key,
            "waypoints": f"{start[0]},{start[1]}|{end[0]},{end[1]}",
            "mode": mode,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
