import asyncio
from datetime import datetime, timedelta

from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.event_parser.parse_yandex_afisha")
def parse_yandex_afisha(initial: bool = False):
    asyncio.run(_parse_async())


async def _parse_async():
    from app.config import settings
    from app.integrations.yandex_afisha import YandexAfishaClient
    from app.database import AsyncSessionLocal
    from app.models.event import Event
    from app.services.geo_service import geocode_address
    from sqlalchemy import text
    import redis.asyncio as aioredis

    redis_client = aioredis.from_url(settings.redis_url, decode_responses=True)
    client = YandexAfishaClient(settings.yandex_afisha_api_key)

    async with AsyncSessionLocal() as db:
        offset = 0
        limit = 20
        cutoff = datetime.utcnow() + timedelta(days=30)

        while True:
            events = await client.fetch_events(offset=offset, limit=limit)
            if not events:
                break

            for ev_data in events:
                lat = ev_data.get("lat")
                lon = ev_data.get("lon")

                if lat is None and ev_data.get("address"):
                    coords = await geocode_address(ev_data["address"], settings.yandex_geocoder_api_key, redis_client)
                    if coords:
                        lat, lon = coords

                if lat is None:
                    continue

                # Upsert by (source, external_id)
                existing = await db.execute(
                    text("SELECT id FROM events WHERE source='yandex_afisha' AND external_id=:eid"),
                    {"eid": str(ev_data["id"])}
                )
                event_row = existing.fetchone()

                if event_row:
                    await db.execute(
                        text("""
                            UPDATE events SET title=:title, lat=:lat, lon=:lon,
                            date_begin=:date_begin, date_end=:date_end, is_active=true,
                            updated_at=NOW()
                            WHERE id=:id
                        """),
                        {
                            "title": ev_data["title"], "lat": lat, "lon": lon,
                            "date_begin": ev_data.get("date_begin"), "date_end": ev_data.get("date_end"),
                            "id": event_row[0],
                        }
                    )
                else:
                    from app.models.event import Event as EventModel
                    event = EventModel(
                        title=ev_data["title"],
                        address=ev_data.get("address"),
                        lat=lat,
                        lon=lon,
                        category=ev_data.get("category"),
                        date_begin=ev_data.get("date_begin"),
                        date_end=ev_data.get("date_end"),
                        source="yandex_afisha",
                        external_id=str(ev_data["id"]),
                    )
                    db.add(event)

                await asyncio.sleep(0.5)

            offset += limit
            await asyncio.sleep(0.5)

        # Deactivate expired events
        await db.execute(
            text("UPDATE events SET is_active=false WHERE date_end < NOW() AND is_active=true")
        )
        await db.commit()

    await redis_client.aclose()
