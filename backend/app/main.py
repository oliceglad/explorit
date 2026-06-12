import asyncio
import logging

from fastapi import FastAPI, WebSocket, Query, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.routers import auth, profile, poi, routes, posts, gamification, moderation, uploads
from app.routers import notifications, geo

logger = logging.getLogger(__name__)

app = FastAPI(title="Explorit Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(poi.router)
app.include_router(routes.router)
app.include_router(posts.router)
app.include_router(gamification.router)
app.include_router(moderation.router)
app.include_router(uploads.router)
app.include_router(notifications.router)
app.include_router(geo.router)


# ─── Error handlers ───────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    errors = [
        {"field": " → ".join(str(l) for l in e["loc"]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Ошибка валидации данных", "errors": errors},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(ValueError)
async def value_error_handler(_request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(_request: Request, exc: SQLAlchemyError):
    logger.error("Database error: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Ошибка базы данных. Попробуйте позже."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Попробуйте позже."},
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/session/{invite_code}")
async def websocket_session(
    ws: WebSocket,
    invite_code: str,
    token: str = Query(...),
):
    from app.websocket.handler import handle_session
    from app.database import AsyncSessionLocal
    from app.dependencies import get_redis_pool

    redis_client = get_redis_pool()
    async with AsyncSessionLocal() as db:
        await handle_session(ws, invite_code, token, db, redis_client)


@app.on_event("startup")
async def startup():
    from app.database import init_db
    from app.dependencies import get_redis_pool
    from app.services.storage_service import ensure_bucket_exists

    await init_db()
    redis_client = get_redis_pool()
    asyncio.create_task(_redis_pubsub_listener(redis_client))
    
    async def safe_ensure_bucket():
        try:
            await asyncio.wait_for(ensure_bucket_exists(), timeout=10.0)
        except asyncio.TimeoutError:
            logger.warning("S3 bucket check timed out on startup")
        except Exception as e:
            logger.warning("S3 bucket check failed on startup: %s", e)

    asyncio.create_task(safe_ensure_bucket())


async def _redis_pubsub_listener(redis_client):
    import json
    from app.websocket.connection_manager import manager

    pubsub = redis_client.pubsub()
    await pubsub.psubscribe("session:*")

    async for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue
        try:
            channel = message["channel"]
            session_id = channel.split(":", 1)[1] if ":" in channel else channel
            data = json.loads(message["data"])
            await manager.broadcast(session_id, data)
        except Exception:
            pass
