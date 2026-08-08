"""Admin CRM endpoints — protected by JWT.

Everything the admin portal needs: application list + search + filters,
detail view, status management with history, assignment, notes, activity
feed, dashboard analytics, exports, executives, notifications.
"""
from __future__ import annotations

import io
import csv
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, func
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..helpers import (
    epoch_ms,
    get_current_admin,
    log_activity,
    serialize_application,
    serialize_activity,
    serialize_history,
    serialize_note,
)
from ..models import (
    Admin,
    ApplicationActivity,
    ApplicationNote,
    ApplicationStatusHistory,
    Customer,
    Executive,
    LoanApplication,
)
from ..schemas import AssignUpdate, ExecutiveCreate, ManualApplication, NoteCreate, StatusUpdate
from ..security import hash_password

router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_admin)], tags=["admin"])

STATUS_LABELS = {
    "new": "New",
    "contacted": "Contacted",
    "docs_pending": "Documents Pending",
    "docs_received": "Documents Received",
    "under_review": "Under Review",
    "approved": "Approved",
    "rejected": "Rejected",
    "disbursed": "Disbursed",
    "closed": "Closed",
}

STATUS_FLOW = [
    "new", "contacted", "docs_pending", "docs_received",
    "under_review", "approved", "disbursed", "closed",
]
TERMINAL = ["rejected", "closed"]


# ---------- applications ----------
def _apply_filters(
    q,
    *,
    search: str = "",
    loan_type: str = "",
    status_: str = "",
    employment: str = "",
    executive_id: Optional[int] = None,
    from_ts: Optional[int] = None,
    to_ts: Optional[int] = None,
):
    base = q
    if search:
        like = f"%{search.strip()}%"
        base = base.filter(
            or_(
                LoanApplication.reference_number.ilike(like),
                LoanApplication.application_number.ilike(like),
                Customer.name.ilike(like),
                Customer.mobile.ilike(like),
                Customer.email.ilike(like),
                Customer.pan.ilike(like),
            )
        )
    if loan_type:
        base = base.filter(LoanApplication.loan_type == loan_type)
    if status_:
        base = base.filter(LoanApplication.status == status_)
    if employment:
        base = base.filter(Customer.employment_type == employment)
    if executive_id:
        base = base.filter(LoanApplication.assigned_to == executive_id)
    if from_ts:
        base = base.filter(LoanApplication.created >= datetime.fromtimestamp(from_ts / 1000, tz=timezone.utc))
    if to_ts:
        base = base.filter(LoanApplication.created <= datetime.fromtimestamp(to_ts / 1000, tz=timezone.utc))
    return base


def _load(db: Session, app_id: int) -> LoanApplication:
    app = (
        db.query(LoanApplication)
        .options(
            joinedload(LoanApplication.customer),
            joinedload(LoanApplication.executive),
            joinedload(LoanApplication.status_history),
            joinedload(LoanApplication.notes),
            joinedload(LoanApplication.activity),
        )
        .filter(LoanApplication.id == app_id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.get("/applications")
def list_applications(
    search: str = "",
    loan_type: str = "",
    status: str = "",
    employment: str = "",
    executive_id: Optional[int] = None,
    from_ts: Optional[int] = None,
    to_ts: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    q = (
        db.query(LoanApplication)
        .join(Customer, LoanApplication.customer_id == Customer.id, isouter=True)
        .options(
            joinedload(LoanApplication.customer),
            joinedload(LoanApplication.executive),
        )
    )
    q = _apply_filters(
        q,
        search=search,
        loan_type=loan_type,
        status_=status,
        employment=employment,
        executive_id=executive_id,
        from_ts=from_ts,
        to_ts=to_ts,
    )
    total = q.count()
    rows = (
        q.order_by(LoanApplication.created.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"total": total, "page": page, "per_page": per_page, "items": [serialize_application(a) for a in rows]}


@router.post("/applications")
def create_application(
    body: ManualApplication,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    """Manually create an application from the admin portal (offline intake)."""
    from ..helpers import make_reference_number, next_application_number

    customer = Customer(
        name=body.name.strip(),
        mobile=body.phone.strip(),
        email=body.email.strip().lower(),
        pan=(body.pan or "").strip(),
        city=body.city,
        employment_type=body.employment or None,
    )
    db.add(customer)
    db.flush()

    app = LoanApplication(
        application_number=next_application_number(db),
        reference_number=make_reference_number(),
        customer_id=customer.id,
        loan_type=body.loan_type,
        loan_label=body.loan_label or _loan_label(body.loan_type),
        amount=int(body.amount or 0),
        tenure_months=int(body.tenure_months or 36),
        status="new",
        assigned_to=body.executive_id,
        source="manual",
        created=datetime.now(timezone.utc),
        submitted_at=datetime.now(timezone.utc),
    )
    db.add(app)
    db.flush()
    log_activity(db, app, "application_created", f"Application created manually by {admin.name}.", actor=admin.name)
    db.commit()
    return serialize_application(_load(db, app.id))


def _loan_label(loan_type: str) -> str:
    return {
        "personal": "Personal Loan",
        "business": "Business Loan",
        "home": "Home Loan",
        "lap": "Loan Against Property",
    }.get(loan_type, loan_type or "Personal Loan")


@router.get("/applications/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db)):
    return serialize_application(_load(db, app_id))


@router.get("/applications/{app_id}/activity")
def application_activity(app_id: int, db: Session = Depends(get_db)):
    _load(db, app_id)  # 404 check
    rows = (
        db.query(ApplicationActivity)
        .filter(ApplicationActivity.application_id == app_id)
        .order_by(ApplicationActivity.created_at.desc())
        .limit(100)
        .all()
    )
    return [serialize_activity(a) for a in rows]


@router.patch("/applications/{app_id}/status")
def update_status(app_id: int, body: StatusUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    app = _load(db, app_id)
    if body.status not in STATUS_LABELS:
        raise HTTPException(status_code=422, detail="Unknown status")

    if app.status != body.status:
        app.status_history.append(
            ApplicationStatusHistory(
                application_id=app.id,
                from_status=app.status,
                to_status=body.status,
                note=body.note,
                changed_by=admin.name,
            )
        )
        log_activity(
            db, app, "status_changed",
            f"Status changed to {STATUS_LABELS[body.status]}"
            + (f" — {body.note}" if body.note else ""),
            actor=admin.name,
        )
        app.status = body.status

    db.commit()
    return serialize_application(_load(db, app_id))


@router.patch("/applications/{app_id}/assign")
def assign_executive(app_id: int, body: AssignUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    app = _load(db, app_id)
    exec_ = None
    if body.executive_id is not None:
        exec_ = db.get(Executive, body.executive_id)
        if not exec_:
            raise HTTPException(status_code=404, detail="Executive not found")
    app.assigned_to = exec_.id if exec_ else None
    log_activity(
        db, app, "executive_assigned",
        f"Assigned to {exec_.name}" if exec_ else "Unassigned",
        actor=admin.name,
    )
    db.commit()
    return serialize_application(_load(db, app_id))


@router.post("/applications/{app_id}/notes")
def add_note(app_id: int, body: NoteCreate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    app = _load(db, app_id)
    note = ApplicationNote(application_id=app.id, text=body.text.strip(), author=admin.name)
    db.add(note)
    log_activity(db, app, "note_added", f"Note added: {body.text.strip()[:120]}", actor=admin.name)
    db.commit()
    return serialize_note(note)


# ---------- activity / notifications feed ----------
@router.get("/activity")
def activity_feed(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.query(ApplicationActivity).order_by(ApplicationActivity.created_at.desc()).limit(limit).all()
    return [serialize_activity(a) for a in rows]


@router.get("/notifications")
def notifications(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Recent events surfaced as notifications for the bell menu."""
    rows = db.query(ApplicationActivity).order_by(ApplicationActivity.created_at.desc()).limit(limit).all()
    out = []
    for a in rows:
        title = "New application" if a.action == "application_created" else STATUS_LABELS.get(a.action, "Update")
        out.append({
            "id": a.id,
            "kind": "app" if a.action == "application_created" else "status",
            "title": title,
            "body": a.text,
            "at": epoch_ms(a.created_at),
            "read": False,
        })
    return out


# ---------- dashboard analytics ----------
@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = today_start.replace(day=1)

    def count(**kw):
        return db.query(func.count(LoanApplication.id)).filter_by(**kw).scalar() or 0

    by_status = {s: 0 for s in STATUS_LABELS}
    rows = db.query(LoanApplication.status, func.count(LoanApplication.id)).group_by(LoanApplication.status).all()
    for st, n in rows:
        by_status[st] = n

    total_requested = db.query(func.coalesce(func.sum(LoanApplication.amount), 0)).scalar() or 0
    total_disbursed = (
        db.query(func.coalesce(func.sum(LoanApplication.amount), 0))
        .filter(LoanApplication.status == "disbursed")
        .scalar() or 0
    )

    loan_mix = {}
    for lt in ["personal", "business", "home", "lap"]:
        loan_mix[lt] = count(loan_type=lt)

    # last 12 months
    months = []
    for i in range(11, -1, -1):
        start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i * 30)
        end = (start + timedelta(days=31)).replace(day=1)
        n = (
            db.query(func.count(LoanApplication.id))
            .filter(LoanApplication.created >= start, LoanApplication.created < end)
            .scalar() or 0
        )
        months.append({"label": start.strftime("%b"), "n": n, "disbursed": 0})

    return {
        "total": count(),
        "today": count() if False else (db.query(func.count(LoanApplication.id)).filter(LoanApplication.created >= today_start).scalar() or 0),
        "active": sum(n for s, n in by_status.items() if s not in TERMINAL),
        "needsAction": by_status.get("new", 0) + by_status.get("docs_pending", 0),
        "monthApps": (db.query(func.count(LoanApplication.id)).filter(LoanApplication.created >= month_start).scalar() or 0),
        "totalRequested": total_requested,
        "totalDisbursed": total_disbursed,
        "disbursed": by_status.get("disbursed", 0),
        "approved": by_status.get("approved", 0),
        "rejected": by_status.get("rejected", 0),
        "assigned": (db.query(func.count(LoanApplication.id)).filter(LoanApplication.assigned_to.isnot(None)).scalar() or 0),
        "unassigned": (db.query(func.count(LoanApplication.id)).filter(LoanApplication.assigned_to.is_(None)).scalar() or 0),
        "byStatus": [{"id": s, "label": l, "count": by_status[s]} for s, l in STATUS_LABELS.items()],
        "byLoanType": [{"id": k, "label": l, "count": v} for k, v in loan_mix.items()
                       for l in [{"personal": "Personal Loan", "business": "Business Loan", "home": "Home Loan", "lap": "Loan Against Property"}[k]]],
        "byMonth": months,
    }


# ---------- exports ----------
@router.get("/export")
def export_applications(
    fmt: str = Query("csv", pattern="^(csv|xlsx)$"),
    search: str = "",
    loan_type: str = "",
    status: str = "",
    employment: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(LoanApplication).join(Customer, isouter=True).options(joinedload(LoanApplication.customer), joinedload(LoanApplication.executive))
    q = _apply_filters(q, search=search, loan_type=loan_type, status_=status, employment=employment)
    rows = q.order_by(LoanApplication.created.desc()).all()

    headers = ["Ref", "Application No", "Name", "Mobile", "Email", "PAN", "Loan", "Amount", "Status", "Owner", "Created", "Source"]
    data = []
    for a in rows:
        c = a.customer
        data.append([
            a.reference_number, a.application_number,
            (c.name if c else ""), (c.mobile if c else ""), (c.email if c else ""),
            (c.pan if c else ""), a.loan_label, a.amount, a.status,
            (a.executive.name if a.executive else ""),
            a.created.strftime("%Y-%m-%d %H:%M") if a.created else "", a.source,
        ])

    if fmt == "xlsx":
        from openpyxl import Workbook
        wb = Workbook()
        ws = wb.active
        ws.title = "Applications"
        ws.append(headers)
        for r in data:
            ws.append(r)
        buf = io.BytesIO()
        wb.save(buf)
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=applications.xlsx"},
        )

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerows(data)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )


# ---------- executives ----------
@router.get("/executives")
def list_executives(db: Session = Depends(get_db)):
    rows = db.query(Executive).order_by(Executive.name).all()
    return [serialize_executive(e, db) for e in rows]


@router.post("/executives")
def create_executive(body: ExecutiveCreate, db: Session = Depends(get_db)):
    existing = db.query(Executive).filter(Executive.email == body.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="An executive with that email already exists")
    e = Executive(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        phone=body.phone,
        role=body.role,
        color=body.color,
    )
    db.add(e)
    db.commit()
    return serialize_executive(e, db)


@router.patch("/executives/{exec_id}")
def update_executive(exec_id: int, body: dict, db: Session = Depends(get_db)):
    e = db.get(Executive, exec_id)
    if not e:
        raise HTTPException(status_code=404, detail="Executive not found")
    if "enabled" in body:
        e.enabled = bool(body["enabled"])
    if "name" in body:
        e.name = body["name"]
    db.commit()
    return serialize_executive(e, db)


def serialize_executive(e: Executive, db: Session) -> dict:
    apps = (
        db.query(func.count(LoanApplication.id))
        .filter(LoanApplication.assigned_to == e.id)
        .scalar() or 0
    )
    return {
        "id": e.id,
        "name": e.name,
        "email": e.email,
        "phone": e.phone or "",
        "role": e.role,
        "color": e.color,
        "enabled": e.enabled,
        "apps": apps,
        "created": epoch_ms(e.created_at),
    }


@router.get("/meta")
def meta():
    return {
        "STATUS_FLOW": STATUS_FLOW,
        "TERMINAL": TERMINAL,
        "STATUS_MAP": {k: {"id": k, "label": v} for k, v in STATUS_LABELS.items()},
        "LOAN_TYPES": [
            {"id": "personal", "label": "Personal Loan", "min": 50000, "max": 1500000},
            {"id": "business", "label": "Business Loan", "min": 200000, "max": 5000000},
            {"id": "home", "label": "Home Loan", "min": 1500000, "max": 20000000},
            {"id": "lap", "label": "Loan Against Property", "min": 2500000, "max": 25000000},
        ],
    }