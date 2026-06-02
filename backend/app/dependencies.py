from typing import Optional

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.utils.jwt import decode_token

_security = HTTPBearer(auto_error=False)
_redis_pool: Optional[aioredis.Redis] = None


def get_redis_pool() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis_pool


async def get_redis() -> aioredis.Redis:
    return get_redis_pool()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_admin_user(current_user=Depends(get_current_user)):
    if not current_user.is_admin:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_security),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User

    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    return result.scalar_one_or_none()
