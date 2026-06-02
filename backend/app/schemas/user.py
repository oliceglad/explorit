from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr, ConfigDict


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    nickname: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
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


class UpdateProfileRequest(BaseModel):
    nickname: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    interests: Optional[List[str]] = None
    push_token: Optional[str] = None
    push_platform: Optional[str] = None
