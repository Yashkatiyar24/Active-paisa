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


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()