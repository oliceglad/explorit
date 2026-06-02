import asyncio
from datetime import datetime
from typing import Optional

import httpx
import redis.asyncio as aioredis

from app.integrations.circuit_breaker import circuit_breaker

_CATEGORY_MAP = {
    "концерт": "concert",
    "concert": "concert",
    "выставка": "exhibition",
    "театр": "theatre",
    "фестиваль": "festival",
    "спорт": "sport",
}


class YandexAfishaClient:
    service_name = "yandex_afisha"

    def __init__(self, api_key: str, redis_client: aioredis.Redis | None = None):
        self.api_key = api_key
        self.redis_client = redis_client

    @circuit_breaker(failure_threshold=5, recovery_timeout=60)
    async def fetch_events(self, offset: int = 0, limit: int = 20) -> list[dict]:
        url = "https://afisha.yandex.ru/api/events"
        params = {"city": "samara", "limit": limit, "offset": offset, "period": "month"}
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"OAuth {self.api_key}"

        retries = 0
        delay = 1

        while retries < 5:
            try:
                async with httpx.AsyncClient(timeout=15) as client:
                    resp = await client.get(url, params=params, headers=headers)
                    if resp.status_code == 429:
                        await asyncio.sleep(delay)
                        delay = min(delay * 2, 30)
                        retries += 1
                        continue
                    resp.raise_for_status()
                    data = resp.json()
                    return _parse_events(data)
            except httpx.HTTPStatusError:
                return []

        return []


def _parse_events(data: dict) -> list[dict]:
    results = []
    for item in data.get("items", []):
        ev = {
            "id": item.get("event", {}).get("id") or item.get("id"),
            "title": item.get("event", {}).get("name") or item.get("title", ""),
            "address": None,
            "lat": None,
            "lon": None,
            "date_begin": None,
            "date_end": None,
            "category": None,
        }

        place = item.get("event", {}).get("place") or item.get("place", {})
        if place:
            coords = place.get("coordinates", {})
            if coords:
                ev["lat"] = coords.get("latitude")
                ev["lon"] = coords.get("longitude")
            ev["address"] = place.get("address")

        schedule = item.get("event", {}).get("scheduleInfo") or item.get("scheduleInfo", {})
        if schedule:
            if schedule.get("dateBegin"):
                try:
                    ev["date_begin"] = datetime.fromisoformat(schedule["dateBegin"])
                except ValueError:
                    pass
            if schedule.get("dateEnd"):
                try:
                    ev["date_end"] = datetime.fromisoformat(schedule["dateEnd"])
                except ValueError:
                    pass

        tags = item.get("event", {}).get("tags", []) or item.get("tags", [])
        for tag in tags:
            name = tag.get("name", "").lower()
            if name in _CATEGORY_MAP:
                ev["category"] = _CATEGORY_MAP[name]
                break

        if ev["id"] and ev["title"]:
            results.append(ev)

    return results
