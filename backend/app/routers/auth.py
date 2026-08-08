"""Authentication endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import get_current_admin
from ..models import Admin
from ..schemas import LoginRequest, MeResponse
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.email == body.email.lower().strip()).first()
    if not admin or not admin.enabled or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(str(admin.id), admin.name, admin.role)
    return {"ok": True, "token": token, "user": serialize_admin(admin)}


@router.get("/me", response_model=MeResponse)
def me(admin: Admin = Depends(get_current_admin)):
    return serialize_admin(admin)


def serialize_admin(a: Admin) -> dict:
    return {"id": a.id, "name": a.name, "email": a.email, "role": a.role, "enabled": a.enabled, "color": "#0C6E6E"}