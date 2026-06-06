from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def create_notification(
    recipient_id,
    actor_id,
    notif_type: str,
    entity_id,
    entity_type: str,
    db: AsyncSession,
) -> None:
    if str(recipient_id) == str(actor_id):
        return
    db.add(Notification(
        recipient_id=recipient_id,
        actor_id=actor_id,
        type=notif_type,
        entity_id=entity_id,
        entity_type=entity_type,
    ))
