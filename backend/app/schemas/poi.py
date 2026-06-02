from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class POIResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str] = None
    category: str
    address: Optional[str] = None
    lat: float
    lon: float
    rating: float
    photo_url: Optional[str] = None
    is_active: bool


class POIListParams(BaseModel):
    lat: float
    lon: float
    radius_km: float = 5.0
    categories: Optional[list[str]] = None
    limit: int = 20
