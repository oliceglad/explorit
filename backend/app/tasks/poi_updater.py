from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.poi_updater.update_poi")
def update_poi():
    """Placeholder for POI update logic (e.g., from Yandex Places API)."""
    pass
