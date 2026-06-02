import asyncio

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.notifications.send_push_notification")
def send_push_notification(user_id: str, title: str, body: str, data: dict):
    asyncio.run(_send_async(user_id, title, body, data))


async def _send_async(user_id: str, title: str, body: str, data: dict):
    from app.config import settings
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.services.notification_service import send_fcm, send_apns
    import redis.asyncio as aioredis
    from sqlalchemy import select

    notification_type = data.get("type", "generic")
    object_id = data.get("level") or data.get("route_id") or "0"
    dedup_key = f"push_sent:{user_id}:{notification_type}:{object_id}"

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    already_sent = await redis_client.exists(dedup_key)
    if already_sent:
        await redis_client.aclose()
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.push_token:
            await redis_client.aclose()
            return

        success = False
        if user.push_platform == "android":
            success = await send_fcm(user.push_token, title, body, data, settings.fcm_server_key)
        elif user.push_platform == "ios":
            success = await send_apns(user.push_token, title, body, data, settings.apns_key_id, settings.apns_team_id)

        if not success:
            user.push_token = None
            await db.commit()
        else:
            await redis_client.setex(dedup_key, 300, "1")

    await redis_client.aclose()
