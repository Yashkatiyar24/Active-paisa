"""Activ Paisa — FastAPI application.

Serves both the public website (static files) and the JSON API on one
origin, so the existing frontend needs no CORS or URL changes.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import models
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin as admin_router
from .routers import auth as auth_router
from .routers import public as public_router
from .routers import stream as stream_router
from .security import hash_password

ADMIN_EMAIL = "MohammadAnwar@activpaisa.com"
ADMIN_PASSWORD = "MohammadAnwar@123"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_admin()
    yield


def _ensure_admin() -> None:
    db = SessionLocal()
    try:
        admin = db.query(models.Admin).filter(models.Admin.email == ADMIN_EMAIL.lower()).first()
        if not admin:
            db.add(
                models.Admin(
                    name="Mohammad Anwar",
                    email=ADMIN_EMAIL.lower(),
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role="super_admin",
                )
            )
            db.commit()
    finally:
        db.close()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- API routes (mounted before static so /api never falls through) ----
app.include_router(auth_router.router)
app.include_router(public_router.router)
app.include_router(admin_router.router)
app.include_router(stream_router.router)


@app.get("/api/v1/health")
def health():
    return {"ok": True, "service": "activpaisa-api", "database": "postgres"}


# ---- static site (served last so /api wins) ----
_static = StaticFiles(directory=settings.static_root, html=True)
app.mount("/assets", StaticFiles(directory=f"{settings.static_root}/assets"), name="assets")
app.mount("/", _static, name="site")


@app.get("/admin")
def admin_index():
    return FileResponse(f"{settings.static_root}/admin/login.html")