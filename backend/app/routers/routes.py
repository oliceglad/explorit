import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import redis.asyncio as aioredis

from app.database import get_db
from app.dependencies import get_current_user, get_optional_user, get_redis
from app.models.route import Route
from app.models.user import User
from app.schemas.route import RouteResponse, GenerateRouteRequest, ShareRouteResponse, UpdateRouteRequest
from app.services.route_service import generate_route

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("/catalog", response_model=list[RouteResponse])
async def get_catalog(
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Route).where(Route.is_public == True).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


@router.get("/", response_model=list[RouteResponse])
async def list_routes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.author_id == current_user.id))
    return list(result.scalars().all())


@router.get("/{route_id}", response_model=RouteResponse)
async def get_route(
    route_id: UUID,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if not route.is_public and (current_user is None or route.author_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return route


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your route")
    await db.delete(route)
    await db.flush()


@router.patch("/{route_id}", response_model=RouteResponse)
async def update_route(
    route_id: UUID,
    body: UpdateRouteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your route")
    if body.title is not None:
        route.title = body.title
    if body.description is not None:
        route.description = body.description
    if body.photo_url is not None:
        route.photo_url = body.photo_url
    if body.photos is not None:
        route.photos = body.photos
    if body.is_public is not None:
        route.is_public = body.is_public
    if body.is_saved is not None:
        route.is_saved = body.is_saved
    await db.flush()
    return route


@router.post("/{route_id}/save", response_model=RouteResponse)
async def save_route(
    route_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your route")
    route.is_saved = True
    await db.flush()
    return route


@router.post("/{route_id}/publish", response_model=RouteResponse)
async def publish_route(
    route_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your route")
    route.is_public = True
    await db.flush()
    return route


@router.post("/{route_id}/share", response_model=ShareRouteResponse)
async def share_route(
    route_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.author_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your route")
    if not route.invite_link:
        route.invite_link = str(uuid.uuid4()).replace("-", "")[:16]
        await db.flush()
    return ShareRouteResponse(invite_link=route.invite_link)


@router.post("/generate", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def generate(
    body: GenerateRouteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: aioredis.Redis = Depends(get_redis),
):
    route = await generate_route(
        lat=body.lat,
        lon=body.lon,
        radius_km=body.radius_km,
        max_points=min(body.max_points, 10),
        categories=body.categories,
        transport_mode=body.transport_mode,
        max_duration_min=body.max_duration_min,
        user_id=str(current_user.id),
        db=db,
        redis_client=redis_client,
        waypoints=[w.model_dump() for w in body.waypoints] if body.waypoints else None,
        surprise_me=body.surprise_me,
    )
    return route
