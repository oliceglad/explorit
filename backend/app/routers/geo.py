from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.dependencies import get_redis
from app.services.geo_service import search_places, extract_interests_categories

router = APIRouter(prefix="/api/geo", tags=["geo"])


@router.get("/search")
async def search_geo(
    q: str = Query(..., min_length=2),
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    return await search_places(q, lat, lon, redis_client)


class InterestsRequest(BaseModel):
    text: str


@router.post("/interests")
async def parse_interests(body: InterestsRequest):
    categories = extract_interests_categories(body.text)
    return {"categories": categories}
