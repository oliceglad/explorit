from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
import redis.asyncio as aioredis

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, get_redis
from app.models.user import User, Follow
from app.models.route import Route
from app.schemas.user import UserResponse, UserPublicResponse, UpdateProfileRequest
from app.schemas.route import RouteResponse

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    interests_changed = body.interests is not None and body.interests != current_user.interests

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)

    if interests_changed:
        async for key in redis_client.scan_iter(f"score:{current_user.id}:*"):
            await redis_client.delete(key)

    await db.flush()
    return current_user


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_public_profile(
    user_id: UUID,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    followers_count = (await db.execute(
        select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
    )).scalar() or 0

    following_count = (await db.execute(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    )).scalar() or 0

    is_following: Optional[bool] = None
    if current_user:
        existing = (await db.execute(
            select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        )).scalar_one_or_none()
        is_following = existing is not None

    return UserPublicResponse(
        id=user.id,
        nickname=user.nickname,
        avatar_url=user.avatar_url,
        bio=user.bio,
        interests=user.interests or [],
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
    )


@router.post("/follow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot follow yourself")
    existing = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    if not existing.scalar_one_or_none():
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        await db.flush()
        from app.services.notification_db import create_notification
        await create_notification(user_id, current_user.id, "follow", current_user.id, "user", db)


@router.delete("/follow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == user_id)
    )
    follow = result.scalar_one_or_none()
    if follow:
        await db.delete(follow)
        await db.flush()


@router.get("/me/archive", response_model=list[RouteResponse])
async def get_archive(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Route)
        .options(joinedload(Route.author))
        .where(Route.author_id == current_user.id, Route.is_saved == True)
    )
    return list(result.scalars().all())
