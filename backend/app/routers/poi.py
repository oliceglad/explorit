from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.poi import POI
from app.schemas.poi import POIResponse
from app.services.route_service import get_poi_in_radius

router = APIRouter(prefix="/api/poi", tags=["poi"])


@router.get("/", response_model=list[POIResponse])
async def list_poi(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(default=5.0, le=50.0),
    categories: Optional[list[str]] = Query(default=None),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    return await get_poi_in_radius(lat, lon, radius_km, categories, limit, db)


@router.get("/{poi_id}", response_model=POIResponse)
async def get_poi(poi_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(POI).where(POI.id == poi_id))
    poi = result.scalar_one_or_none()
    if not poi:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI not found")
    return poi
