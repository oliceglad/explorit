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


class WaypointInput(BaseModel):
    id: str
    name: str
    lat: float
    lon: float


class RouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    author_nickname: Optional[str] = None
    author_avatar_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    photos: Optional[List[str]] = None
    points: List[Any] = []
    polyline: Optional[List[Any]] = None
    distance_m: Optional[float] = None
    duration_min: Optional[int] = None
    transport_mode: str
    is_public: bool
    is_saved: bool
    invite_link: Optional[str] = None
    created_at: datetime


class UpdateRouteRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    photos: Optional[List[str]] = None
    is_public: Optional[bool] = None
    is_saved: Optional[bool] = None


class GenerateRouteRequest(BaseModel):
    lat: float
    lon: float
    radius_km: float = 5.0
    max_points: int = 5
    categories: Optional[List[str]] = None
    transport_mode: str = "walking"
    max_duration_min: int = 120
    waypoints: Optional[List[WaypointInput]] = None
    surprise_me: bool = False


class ShareRouteResponse(BaseModel):
    invite_link: str
