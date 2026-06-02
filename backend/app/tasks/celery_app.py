from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "explorit",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "app.tasks.poi_updater",
        "app.tasks.event_parser",
        "app.tasks.notifications",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Samara",
    enable_utc=True,
    beat_schedule={
        "update-poi": {
            "task": "app.tasks.poi_updater.update_poi",
            "schedule": crontab(minute=0, hour="*/6"),
        },
        "parse-events": {
            "task": "app.tasks.event_parser.parse_yandex_afisha",
            "schedule": crontab(hour=3, minute=0),
        },
    },
)
