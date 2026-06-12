from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    xp: int
    level: int
    level_name: str
    routes_completed: int
    places_discovered: int
    distance_walked_km: float = 0.0
    current_streak: int
    last_activity_date: Optional[datetime] = None


class LeaderboardEntry(BaseModel):
    user_id: UUID
    nickname: str
    avatar_url: Optional[str]
    xp: int
    level: int
    rank: int


class Challenge(BaseModel):
    id: str
    title: str
    description: str
    xp_reward: int
    is_completed: bool = False
