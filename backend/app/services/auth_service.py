from uuid import UUID

import redis.asyncio as aioredis
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.gamification import UserProgress
from app.utils.hashing import hash_password, verify_password
from app.utils.jwt import create_access_token, create_refresh_token, decode_token
from app.config import settings


async def register_user(email: str, nickname: str, password: str, db: AsyncSession) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, nickname=nickname, password_hash=hash_password(password), interests=[])
    db.add(user)
    await db.flush()

    progress = UserProgress(user_id=user.id)
    db.add(progress)
    await db.flush()

    return user


async def login_user(email: str, password: str, db: AsyncSession) -> tuple[str, str]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return access, refresh


async def store_refresh_token(user_id: str, token: str, redis_client: aioredis.Redis) -> None:
    from app.utils.hashing import hash_password as _hash
    import hashlib
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    key = f"refresh:{user_id}"
    ttl = settings.refresh_token_expire_days * 86400
    await redis_client.setex(key, ttl, token_hash)


async def refresh_tokens(refresh_token: str, redis_client: aioredis.Redis) -> tuple[str, str]:
    import hashlib

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload["sub"]
    stored_hash = await redis_client.get(f"refresh:{user_id}")
    if not stored_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    stored = stored_hash.decode() if isinstance(stored_hash, bytes) else stored_hash
    if token_hash != stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token mismatch")

    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)
    await store_refresh_token(user_id, new_refresh, redis_client)
    return new_access, new_refresh
