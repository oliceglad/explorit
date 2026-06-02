import os
from logging.config import fileConfig
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text
from alembic import context

# Load .env from the project root (one level up from alembic/)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

db_url = os.getenv("DATABASE_URL_SYNC")
if not db_url:
    raise RuntimeError("DATABASE_URL_SYNC is not set. Check your .env file.")
config.set_main_option("sqlalchemy.url", db_url)

from app.database import Base
import app.models  # noqa: F401,E402 — side-effect import: registers ORM models in Base.metadata

target_metadata = Base.metadata


def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table":
        # Only manage tables that are defined in our SQLAlchemy models
        return name in target_metadata.tables
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis_topology"))
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
