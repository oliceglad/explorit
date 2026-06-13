from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    nickname: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    interests: List[str] = []
    is_active: bool
    created_at: datetime


class UserPublicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nickname: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    interests: List[str] = []
    followers_count: int = 0
    following_count: int = 0
    is_following: Optional[bool] = None


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
    full_name: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: Optional[List[str]] = None
    push_token: Optional[str] = None
    push_platform: Optional[str] = None
