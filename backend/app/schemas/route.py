from uuid import UUID
from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict


class RoutePoint(BaseModel):
    order: int
    poi_id: Optional[str] = None
    lat: float
    lon: float
    name: str


class RouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    title: Optional[str] = None
    description: Optional[str] = None
    points: List[Any] = []
    distance_m: Optional[float] = None
    duration_min: Optional[int] = None
    transport_mode: str
    is_public: bool
    is_saved: bool
    invite_link: Optional[str] = None
    created_at: datetime


class GenerateRouteRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 5.0
    max_points: int = 5
    categories: Optional[List[str]] = None
    transport_mode: str = "walking"
    max_duration_min: int = 120


class ShareRouteResponse(BaseModel):
    invite_link: str
