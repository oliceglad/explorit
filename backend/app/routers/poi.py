from uuid import UUID
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_redis
from app.models.poi import POI
from app.schemas.poi import POIResponse, OverpassPOIResponse
from app.services.geo_service import fetch_overpass_pois

router = APIRouter(prefix="/api/poi", tags=["poi"])


@router.get("/", response_model=list[OverpassPOIResponse])
async def list_poi(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(default=5.0, le=50.0),
    categories: Optional[str] = Query(default=None),
    redis_client: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    cats = [c.strip() for c in categories.split(",")] if categories else None
    return await fetch_overpass_pois(lat, lon, radius_km, cats, redis_client, db)


@router.get("/{poi_id}", response_model=POIResponse)
async def get_poi(poi_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(POI).where(POI.id == poi_id))
    poi = result.scalar_one_or_none()
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI not found")
    return poi
