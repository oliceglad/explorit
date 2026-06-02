from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.post import Post, Report, POST_STATUS_ACTIVE, POST_STATUS_BLOCKED
from app.models.user import User
from app.schemas.post import PostResponse, ReportResponse

router = APIRouter(prefix="/api/moderation", tags=["moderation"])


@router.get("/reports", response_model=list[ReportResponse])
async def list_reports(
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Список всех жалоб, отсортированных по дате (новые первые)."""
    result = await db.execute(
        select(Report).order_by(Report.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


@router.get("/posts/reported", response_model=list[PostResponse])
async def list_reported_posts(
    min_reports: int = Query(default=1),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Посты с жалобами (включая уже заблокированные)."""
    result = await db.execute(
        select(Post)
        .where(Post.reports_count >= min_reports)
        .order_by(Post.reports_count.desc(), Post.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.post("/posts/{post_id}/block", response_model=PostResponse)
async def block_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Заблокировать пост — он исчезнет из ленты и поиска."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.status = POST_STATUS_BLOCKED
    await db.flush()
    return post


@router.post("/posts/{post_id}/approve", response_model=PostResponse)
async def approve_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Снять блокировку и сбросить счётчик жалоб."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post.status = POST_STATUS_ACTIVE
    post.reports_count = 0
    await db.flush()
    return post
