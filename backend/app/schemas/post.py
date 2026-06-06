from uuid import UUID
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    author_id: UUID
    route_id: Optional[UUID] = None
    content: str
    photo_url: Optional[str] = None
    likes_count: int
    comments_count: int
    reports_count: int
    status: str
    created_at: datetime
    updated_at: datetime
    is_liked: Optional[bool] = None


class CreatePostRequest(BaseModel):
    content: str
    photo_url: Optional[str] = None
    route_id: Optional[UUID] = None


class UpdatePostRequest(BaseModel):
    content: Optional[str] = None
    photo_url: Optional[str] = None


class CommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    author_id: UUID
    content: str
    likes_count: int = 0
    is_liked: Optional[bool] = None
    created_at: datetime
    updated_at: datetime


class CreateCommentRequest(BaseModel):
    content: str


class UpdateCommentRequest(BaseModel):
    content: str


class ReportRequest(BaseModel):
    reason: str


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    post_id: UUID
    reporter_id: UUID
    reason: str
    created_at: datetime
