from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── База данных (обязательные) ──────────────────────────────────────────
    database_url: str
    database_url_sync: str

    # ── Redis ───────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── JWT (обязательный) ──────────────────────────────────────────────────
    secret_key: str
    access_token_expire_minutes: int = 1440
    refresh_token_expire_days: int = 30

    # ── Яндекс (опциональные) ───────────────────────────────────────────────
    yandex_maps_api_key: str = ""
    yandex_geocoder_api_key: str = ""
    yandex_afisha_api_key: str = ""

    # ── Push-уведомления (опциональные) ─────────────────────────────────────
    fcm_server_key: str = ""
    apns_key_id: str = ""
    apns_team_id: str = ""

    # ── S3 / Selectel (обязательные) ────────────────────────────────────────
    s3_access_key: str
    s3_secret_key: str
    s3_endpoint_url: str
    s3_bucket_name: str
    s3_region: str

    # ── Настройки приложения ────────────────────────────────────────────────
    environment: str = "development"
    max_route_points: int = 10
    default_search_radius_km: float = 5.0
    city_name: str = "Самара"
    city_lat: float = 53.1959
    city_lon: float = 50.1002

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
