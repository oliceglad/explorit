from uuid import UUID
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class GroupSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    route_id: UUID
    host_id: UUID
    invite_code: str
    is_active: bool
    created_at: datetime


class SessionMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    user_id: UUID
    last_lat: Optional[float] = None
    last_lon: Optional[float] = None
    joined_at: datetime


class CreateSessionRequest(BaseModel):
    route_id: UUID
