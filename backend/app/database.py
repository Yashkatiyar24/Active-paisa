"""Database engine, session factory and declarative base."""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# Render/Heroku-style URLs start with postgres:// and make SQLAlchemy try the
# psycopg2 driver. Force the psycopg v3 driver we install in requirements.txt.
def _normalize_url(url: str) -> str:
    if url.startswith("postgres://") or url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.split("://", 1)[1]
    return url


engine = create_engine(
    _normalize_url(settings.database_url),
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


# Columns added after the models first shipped. `create_all` never alters
# existing tables, so we issue idempotent ALTERs here at boot.
_ALTERS = [
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS state VARCHAR(40)",
    "ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS property_city VARCHAR(80)",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS property_value BIGINT",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS purpose VARCHAR(80)",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS monthly_obligations BIGINT",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(300)",
    "ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ",
]


def migrate() -> None:
    from sqlalchemy import text

    with engine.begin() as conn:
        for stmt in _ALTERS:
            try:
                conn.execute(text(stmt))
            except Exception:
                continue  # table may not exist yet; create_all handles fresh setups


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()