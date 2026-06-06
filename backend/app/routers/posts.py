from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.post import Post, Comment, Like, Report, POST_STATUS_ACTIVE, POST_STATUS_BLOCKED
from app.models.user import User
from app.schemas.post import (
    PostResponse, CreatePostRequest, UpdatePostRequest,
    CommentResponse, CreateCommentRequest, UpdateCommentRequest,
    ReportRequest, ReportResponse,
)
from app.services.gamification_service import award_xp

router = APIRouter(tags=["posts"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_active_post(post_id: UUID, db: AsyncSession) -> Post:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.status == POST_STATUS_BLOCKED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


async def _with_likes(posts: list[Post], user_id, db: AsyncSession) -> list[PostResponse]:
    liked_ids: set = set()
    if user_id and posts:
        result = await db.execute(
            select(Like.post_id).where(
                Like.user_id == user_id,
                Like.post_id.in_([p.id for p in posts]),
            )
        )
        liked_ids = {row[0] for row in result.fetchall()}
    return [
        PostResponse.model_validate(p).model_copy(
            update={"is_liked": (p.id in liked_ids) if user_id else None}
        )
        for p in posts
    ]


# ─── Feed ─────────────────────────────────────────────────────────────────────

@router.get("/api/feed/", response_model=list[PostResponse])
async def get_feed(
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Post)
        .where(Post.status == POST_STATUS_ACTIVE)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    if cursor:
        cp = await db.execute(select(Post).where(Post.id == UUID(cursor)))
        cp_post = cp.scalar_one_or_none()
        if cp_post:
            query = query.where(Post.created_at < cp_post.created_at)
    result = await db.execute(query)
    posts = list(result.scalars().all())
    return await _with_likes(posts, current_user.id if current_user else None, db)


@router.get("/api/feed/following", response_model=list[PostResponse])
async def get_following_feed(
    current_user: User = Depends(get_current_user),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import Follow
    follows_result = await db.execute(
        select(Follow.following_id).where(Follow.follower_id == current_user.id)
    )
    following_ids = [row[0] for row in follows_result.fetchall()]

    query = (
        select(Post)
        .where(Post.author_id.in_(following_ids), Post.status == POST_STATUS_ACTIVE)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    if cursor:
        cp = await db.execute(select(Post).where(Post.id == UUID(cursor)))
        cp_post = cp.scalar_one_or_none()
        if cp_post:
            query = query.where(Post.created_at < cp_post.created_at)

    result = await db.execute(query)
    posts = list(result.scalars().all())
    return await _with_likes(posts, current_user.id, db)


# ─── Search ───────────────────────────────────────────────────────────────────

@router.get("/api/posts/search", response_model=list[PostResponse])
async def search_posts(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
):
    """Full-text search over post content using PostgreSQL tsvector (Russian)."""
    result = await db.execute(
        text("""
            SELECT id FROM posts
            WHERE status = 'active'
              AND to_tsvector('russian', content) @@ plainto_tsquery('russian', :q)
            ORDER BY ts_rank(to_tsvector('russian', content), plainto_tsquery('russian', :q)) DESC
            LIMIT :limit OFFSET :offset
        """),
        {"q": q, "limit": limit, "offset": offset},
    )
    ids = [row[0] for row in result.fetchall()]
    if not ids:
        return []
    posts = await db.execute(select(Post).where(Post.id.in_(ids)))
    posts_map = {p.id: p for p in posts.scalars().all()}
    return [posts_map[i] for i in ids if i in posts_map]


# ─── CRUD постов ──────────────────────────────────────────────────────────────

@router.post("/api/posts/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    body: CreatePostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = Post(
        author_id=current_user.id,
        content=body.content,
        photo_url=body.photo_url,
        route_id=body.route_id,
    )
    db.add(post)
    await db.flush()
    await award_xp(str(current_user.id), "post_published", db)
    return post


@router.get("/api/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    results = await _with_likes([post], current_user.id if current_user else None, db)
    return results[0]


@router.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    body: UpdatePostRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    if post.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")
    if body.content is not None:
        post.content = body.content
    if body.photo_url is not None:
        post.photo_url = body.photo_url
    await db.flush()
    return post


@router.delete("/api/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your post")
    await db.delete(post)
    await db.flush()


# ─── Лайки ───────────────────────────────────────────────────────────────────

@router.post("/api/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def add_like(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    existing = (await db.execute(
        select(Like).where(Like.post_id == post_id, Like.user_id == current_user.id)
    )).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already liked")
    db.add(Like(post_id=post_id, user_id=current_user.id))
    post.likes_count += 1
    await db.flush()
    from app.services.notification_db import create_notification
    await create_notification(post.author_id, current_user.id, "like", post_id, "post", db)


@router.delete("/api/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def remove_like(
    post_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    existing = (await db.execute(
        select(Like).where(Like.post_id == post_id, Like.user_id == current_user.id)
    )).scalar_one_or_none()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Like not found")
    await db.delete(existing)
    post.likes_count = max(0, post.likes_count - 1)
    await db.flush()


# ─── Комментарии ─────────────────────────────────────────────────────────────

@router.get("/api/posts/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments(post_id: UUID, db: AsyncSession = Depends(get_db)):
    await _get_active_post(post_id, db)
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.is_deleted == "0")
        .order_by(Comment.created_at)
    )
    return list(result.scalars().all())


@router.post("/api/posts/{post_id}/comment", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: UUID,
    body: CreateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    comment = Comment(post_id=post_id, author_id=current_user.id, content=body.content)
    db.add(comment)
    post.comments_count += 1
    await db.flush()
    from app.services.notification_db import create_notification
    await create_notification(post.author_id, current_user.id, "comment", post_id, "post", db)
    return comment


@router.put("/api/posts/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    post_id: UUID,
    comment_id: UUID,
    body: UpdateCommentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_active_post(post_id, db)
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id)
    )
    comment = result.scalar_one_or_none()
    if not comment or comment.is_deleted == "1":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your comment")
    comment.content = body.content
    await db.flush()
    return comment


@router.delete("/api/posts/{post_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    post_id: UUID,
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id, Comment.post_id == post_id)
    )
    comment = result.scalar_one_or_none()
    if not comment or comment.is_deleted == "1":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    if comment.author_id != current_user.id and post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    # Soft delete — контент скрываем, счётчик уменьшаем
    comment.is_deleted = "1"
    comment.content = "[удалено]"
    post.comments_count = max(0, post.comments_count - 1)
    await db.flush()


# ─── Жалобы ──────────────────────────────────────────────────────────────────

@router.post("/api/posts/{post_id}/report", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def report_post(
    post_id: UUID,
    body: ReportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await _get_active_post(post_id, db)

    # One report per user per post
    existing = await db.execute(
        select(Report).where(Report.post_id == post_id, Report.reporter_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already reported")

    report = Report(post_id=post_id, reporter_id=current_user.id, reason=body.reason)
    db.add(report)
    post.reports_count += 1

    # Auto-block after 5 unique reports
    if post.reports_count >= 5:
        post.status = POST_STATUS_BLOCKED

    await db.flush()
    return report
