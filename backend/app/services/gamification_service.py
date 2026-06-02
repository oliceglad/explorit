from datetime import datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.gamification import UserProgress, XP_REWARDS, xp_to_level, level_name


async def award_xp(user_id: str, action_type: str, db: AsyncSession, multiplier: int = 1) -> UserProgress:
    result = await db.execute(select(UserProgress).where(UserProgress.user_id == UUID(user_id)))
    progress = result.scalar_one_or_none()

    if not progress:
        progress = UserProgress(user_id=UUID(user_id))
        db.add(progress)
        await db.flush()

    xp_gain = XP_REWARDS.get(action_type, 0) * multiplier
    if xp_gain == 0:
        return progress

    old_level = progress.level
    progress.xp += xp_gain
    progress.level = xp_to_level(progress.xp)
    progress.last_activity_date = datetime.utcnow()

    if action_type == "route_completed":
        progress.routes_completed += 1
    elif action_type == "new_place_discovered":
        progress.places_discovered += multiplier

    if progress.level > old_level:
        from app.tasks.notifications import send_push_notification
        send_push_notification.delay(
            user_id=user_id,
            title="Новый уровень!",
            body=f"Вы достигли уровня {progress.level}: {level_name(progress.level)}",
            data={"type": "level_up", "level": progress.level},
        )

    await db.flush()
    return progress
