from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis

from app.database import get_db
from app.dependencies import get_redis, get_current_user
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest
from app.schemas.user import UserResponse
from app.services.auth_service import register_user, login_user, store_refresh_token, refresh_tokens
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    user = await register_user(body.email, body.nickname, body.password, db)
    from app.utils.jwt import create_access_token, create_refresh_token
    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    await store_refresh_token(str(user.id), refresh, redis_client)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    access, refresh = await login_user(body.email, body.password, db)
    from app.utils.jwt import decode_token
    payload = decode_token(access)
    await store_refresh_token(payload["sub"], refresh, redis_client)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    redis_client: aioredis.Redis = Depends(get_redis),
):
    access, new_refresh = await refresh_tokens(body.refresh_token, redis_client)
    return TokenResponse(access_token=access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
