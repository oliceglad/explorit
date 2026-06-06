from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ActorInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nickname: str
    avatar_url: Optional[str] = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    type: str
    entity_id: Optional[UUID] = None
    entity_type: Optional[str] = None
    is_read: bool
    created_at: datetime
    actor: Optional[ActorInfo] = None
