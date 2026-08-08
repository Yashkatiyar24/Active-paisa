"""Shared helpers: auth dependency, serialization, reference generation."""
from __future__ import annotations

import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Admin, ApplicationActivity, ApplicationNote, ApplicationStatusHistory, LoanApplication
from .security import decode_access_token


def get_current_admin(
    request: Request, db: Session = Depends(get_db)
) -> Admin:
    auth = request.headers.get("Authorization", "")
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    admin = db.get(Admin, int(payload["sub"]))
    if not admin or not admin.enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable")
    return admin


# ---------- reference / numbering ----------
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"


def make_reference_number() -> str:
    """Human-friendly handle like AP-9854-K2QD."""
    a = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    b = "".join(secrets.choice(_ALPHABET) for _ in range(4))
    return f"AP-{a}-{b}"


def make_application_number(seq: int) -> str:
    return f"AP-{seq:06d}"


def next_application_number(db: Session) -> str:
    seq = db.query(LoanApplication).count() + 1
    return make_application_number(seq)


# ---------- client metadata ----------
def client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def detect_device(user_agent: str | None) -> str:
    ua = (user_agent or "").lower()
    if not ua:
        return "Unknown"
    if "mobile" in ua or "android" in ua or "iphone" in ua:
        return "Mobile"
    if "ipad" in ua:
        return "Tablet"
    return "Desktop"


def epoch_ms(dt: datetime | None) -> int | None:
    return int(dt.timestamp() * 1000) if dt else None


# ---------- serialization (matches the admin UI's data contract) ----------
def serialize_customer(c: Customer) -> dict:
    return {
        "id": c.id,
        "name": c.name or "",
        "phone": c.mobile or "",
        "email": c.email or "",
        "pan": c.pan or "",
        "dob": c.dob or "",
        "city": c.city or "",
        "pincode": c.pincode or "",
        "gender": c.gender or "",
        "employment": c.employment_type or "",
        "company": c.company_name or "",
        "income": c.monthly_income or "",
        "household": c.annual_household_income or "",
        "entityType": c.entity_type or "",
        "vintage": c.vintage or "",
        "gstin": c.gstin or "",
        "address": c.address or "",
        "consentTerms": c.consent_terms,
        "consentPrivacy": c.consent_privacy,
        "consentDeclaration": c.consent_declaration,
    }


def serialize_history(h: ApplicationStatusHistory) -> dict:
    return {"from": h.from_status, "to": h.to_status, "note": h.note, "at": epoch_ms(h.created_at), "by": h.changed_by}


def serialize_note(n: ApplicationNote) -> dict:
    return {"id": n.id, "text": n.text, "at": epoch_ms(n.created_at), "by": n.author}


def serialize_activity(a: ApplicationActivity) -> dict:
    return {
        "id": a.id,
        "application_id": a.application_id,
        "action": a.action,
        "text": a.text,
        "actor": a.actor,
        "at": epoch_ms(a.created_at),
    }


def serialize_application(app: LoanApplication) -> dict:
    customer = app.customer
    timeline = [{"at": epoch_ms(x.created_at), "text": x.text, "by": x.actor} for x in app.activity] + \
        [{"at": epoch_ms(x.created_at), "text": f"Status {x.from_status or '—'} → {x.to_status}", "by": x.changed_by} for x in app.status_history]
    timeline.sort(key=lambda t: (t["at"] or 0), reverse=True)
    return {
        "id": str(app.id),
        "ref": app.reference_number,
        "application_number": app.application_number,
        "created": epoch_ms(app.created),
        "updated": epoch_ms(app.updated_at),
        "loanId": app.loan_type,
        "loanLabel": app.loan_label,
        "amount": app.amount,
        "tenureMonths": app.tenure_months,
        "status": app.status,
        "executive": (app.executive.name if app.executive else "") or "",
        "executiveId": app.assigned_to,
        "source": app.source,
        "ip": app.ip_address,
        "device": app.device,
        "customer": serialize_customer(customer) if customer else {},
        "timeline": timeline,
        "notes": [serialize_note(n) for n in sorted(app.notes, key=lambda n: n.created_at, reverse=True)],
        "docs": [],
        "consent": {
            "terms": (customer.consent_terms if customer else False),
            "privacy": (customer.consent_privacy if customer else False),
            "declaration": (customer.consent_declaration if customer else False),
        },
    }


def log_activity(
    db: Session,
    app: LoanApplication,
    action: str,
    text: str,
    actor: str = "System",
) -> None:
    db.add(ApplicationActivity(application_id=app.id, action=action, text=text, actor=actor))
    db.flush()