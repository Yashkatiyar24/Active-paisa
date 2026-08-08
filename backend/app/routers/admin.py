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

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
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


def _month_start(base: datetime, offset_months: int) -> datetime:
    y = base.year + ((base.month - 1 + offset_months) // 12)
    m = ((base.month - 1 + offset_months) % 12) + 1
    return datetime(y, m, 1, tzinfo=timezone.utc)


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
    city: str = "",
    min_income: Optional[int] = None,
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
                Customer.company_name.ilike(like),
                Customer.address.ilike(like),
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
    if city:
        base = base.filter(Customer.city.ilike(f"%{city.strip()}%"))
    if min_income:
        base = base.filter(Customer.monthly_income >= min_income)
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
            joinedload(LoanApplication.documents),
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
    city: str = "",
    min_income: Optional[int] = None,
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
        city=city,
        min_income=min_income,
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
        if app.status in TERMINAL:
            raise HTTPException(status_code=422, detail="This application is closed and cannot be reopened.")
        if body.status == "rejected" and not body.note:
            raise HTTPException(status_code=422, detail="A rejection reason is required.")
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
        app.rejection_reason = body.note if body.status == "rejected" else None
        if body.status == "disbursed" and not app.disbursed_at:
            app.disbursed_at = datetime.now(timezone.utc)
        from ..models import notify as _notify
        _notify(db, app, "status", "Status updated",
                f"{app.reference_number} moved to {STATUS_LABELS[body.status]}.")

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
    if exec_:
        from ..models import notify as _notify
        _notify(db, app, "assign", "Executive assigned", f"{app.reference_number} assigned to {exec_.name}.")
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


# ---------- customer updates (editable admin fields) ----------
class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    pan: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    address: Optional[str] = None
    employment: Optional[str] = None
    company: Optional[str] = None
    income: Optional[int] = None
    household: Optional[int] = None
    entityType: Optional[str] = None
    vintage: Optional[str] = None
    gstin: Optional[str] = None


@router.patch("/applications/{app_id}/customer")
def update_customer(app_id: int, body: CustomerUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    app = _load(db, app_id)
    c = app.customer
    if not c:
        c = Customer(mobile="")
        db.add(c)
        app.customer = c
        db.flush()
    if body.name is not None: c.name = body.name
    if body.mobile is not None: c.mobile = body.mobile
    if body.email is not None: c.email = body.email
    if body.pan is not None: c.pan = body.pan
    if body.dob is not None: c.dob = body.dob
    if body.gender is not None: c.gender = body.gender
    if body.city is not None: c.city = body.city
    if body.state is not None: c.state = body.state
    if body.pincode is not None: c.pincode = body.pincode
    if body.address is not None: c.address = body.address
    if body.employment is not None: c.employment_type = body.employment
    if body.company is not None: c.company_name = body.company
    if body.income is not None: c.monthly_income = body.income
    if body.household is not None: c.annual_household_income = body.household
    if body.entityType is not None: c.entity_type = body.entityType
    if body.vintage is not None: c.vintage = body.vintage
    if body.gstin is not None: c.gstin = body.gstin
    log_activity(db, app, "customer_updated", "Customer details updated by admin.", actor=admin.name)
    db.commit()
    return serialize_application(_load(db, app_id))


# ---------- loan-fact updates ----------
class LoanUpdate(BaseModel):
    amount: Optional[int] = None
    tenure_months: Optional[int] = None
    loan_type: Optional[str] = None
    loan_label: Optional[str] = None
    property_value: Optional[int] = None
    property_city: Optional[str] = None
    purpose: Optional[str] = None
    monthly_obligations: Optional[int] = None


@router.patch("/applications/{app_id}/loan")
def update_loan(app_id: int, body: LoanUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    app = _load(db, app_id)
    if body.amount is not None: app.amount = body.amount
    if body.tenure_months is not None: app.tenure_months = body.tenure_months
    if body.loan_type is not None:
        app.loan_type = body.loan_type
        app.loan_label = body.loan_label or _loan_label(body.loan_type)
    elif body.loan_label is not None:
        app.loan_label = body.loan_label
    if body.property_value is not None: app.property_value = body.property_value
    if body.property_city is not None: app.property_city = body.property_city
    if body.purpose is not None: app.purpose = body.purpose
    if body.monthly_obligations is not None: app.monthly_obligations = body.monthly_obligations
    log_activity(db, app, "loan_updated", "Loan details updated by admin.", actor=admin.name)
    db.commit()
    return serialize_application(_load(db, app_id))


# ---------- documents ----------
class DocumentStatusUpdate(BaseModel):
    status: str  # verified | rejected


@router.get("/applications/{app_id}/documents")
def list_documents(app_id: int, db: Session = Depends(get_db)):
    from ..helpers import serialize_document
    from ..models import ApplicationDocument
    _load(db, app_id)
    rows = (
        db.query(ApplicationDocument)
        .filter(ApplicationDocument.application_id == app_id)
        .order_by(ApplicationDocument.created_at.desc())
        .all()
    )
    return [serialize_document(d) for d in rows]


@router.post("/applications/{app_id}/documents")
async def upload_document(
    app_id: int,
    file: UploadFile = File(...),
    label: str = Form("Document"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin),
):
    from ..helpers import serialize_document
    from ..models import ApplicationDocument
    _load(db, app_id)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Empty file")
    allowed = {"application/pdf", "image/png", "image/jpeg"}
    if (file.content_type or "") not in allowed:
        raise HTTPException(status_code=422, detail="Only PDF, PNG and JPEG files are supported.")
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="File too large (max 10 MB).")
    doc = ApplicationDocument(
        application_id=app_id,
        label=label[:80],
        filename=file.filename or "document",
        content_type=file.content_type or "application/octet-stream",
        data=data.hex(),
        size=len(data),
        status="new",
        uploaded_by=admin.name,
    )
    db.add(doc)
    db.flush()
    app = _load(db, app_id)
    log_activity(db, app, "document_uploaded", f"Document uploaded: {doc.filename}", actor=admin.name)
    db.commit()
    return serialize_document(doc)


@router.get("/documents/{doc_id}/download")
def download_document(doc_id: int, db: Session = Depends(get_db)):
    from ..models import ApplicationDocument
    d = db.get(ApplicationDocument, doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    data = bytes.fromhex(d.data)
    cd = f'attachment; filename="{d.filename}"'
    return Response(content=data, media_type=d.content_type, headers={"Content-Disposition": cd})


@router.patch("/documents/{doc_id}")
def update_document(doc_id: int, body: DocumentStatusUpdate, db: Session = Depends(get_db), admin: Admin = Depends(get_current_admin)):
    from ..helpers import serialize_document
    from ..models import ApplicationDocument
    d = db.get(ApplicationDocument, doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.status not in ("verified", "rejected"):
        raise HTTPException(status_code=422, detail="Status must be verified or rejected")
    d.status = body.status
    app = db.get(LoanApplication, d.application_id)
    log_activity(
        db, app, "document_" + body.status,
        f"Document {body.status}: {d.filename}", actor=admin.name,
    )
    db.commit()
    return serialize_document(d)


# ---------- activity / notifications feed ----------
@router.get("/activity")
def activity_feed(limit: int = Query(50, ge=1, le=200), db: Session = Depends(get_db)):
    rows = db.query(ApplicationActivity).order_by(ApplicationActivity.created_at.desc()).limit(limit).all()
    return [serialize_activity(a) for a in rows]


@router.get("/notifications")
def notifications(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    from ..models import Notification
    rows = db.query(Notification).order_by(Notification.created_at.desc()).limit(limit).all()
    return [
        {
            "id": n.id,
            "kind": n.kind,
            "title": n.title,
            "body": n.body,
            "at": epoch_ms(n.created_at),
            "read": n.read,
            "application_id": n.application_id,
        }
        for n in rows
    ]


@router.get("/notifications/unread-count")
def notifications_unread_count(db: Session = Depends(get_db)):
    from ..models import Notification
    n = db.query(func.count(Notification.id)).filter(Notification.read.is_(False)).scalar() or 0
    return {"count": n}


@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    from ..models import Notification
    n = db.get(Notification, notification_id)
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    from ..models import Notification
    db.query(Notification).filter(Notification.read.is_(False)).update({Notification.read: True})
    db.commit()
    return {"ok": True}


# ---------- customers ----------
@router.get("/customers")
def list_customers(
    search: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    from ..helpers import serialize_customer
    q = db.query(Customer)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Customer.name.ilike(like),
                Customer.mobile.ilike(like),
                Customer.email.ilike(like),
                Customer.pan.ilike(like),
                Customer.company_name.ilike(like),
            )
        )
    total = q.count()
    rows = q.order_by(Customer.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [
            {
                **serialize_customer(c),
                "apps": c.applications and len(c.applications) or 0,
                "totalValue": sum(a.amount for a in c.applications),
            }
            for c in rows
        ],
    }


@router.get("/customers/{customer_id}")
def customer_detail(customer_id: int, db: Session = Depends(get_db)):
    from ..helpers import serialize_customer
    c = db.get(Customer, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    apps = (
        db.query(LoanApplication)
        .options(joinedload(LoanApplication.executive))
        .filter(LoanApplication.customer_id == c.id)
        .order_by(LoanApplication.created.desc())
        .all()
    )
    return {
        **serialize_customer(c),
        "applications": [serialize_application(a) for a in apps],
    }


# ---------- global search ----------
@router.get("/search")
def global_search(q: str = Query("", min_length=1), limit: int = Query(20, ge=1, le=50), db: Session = Depends(get_db)):
    """Search across customers, applications, executives and notes."""
    like = f"%{q.strip()}%"
    customers = (
        db.query(Customer)
        .filter(or_(Customer.name.ilike(like), Customer.mobile.ilike(like), Customer.email.ilike(like), Customer.pan.ilike(like)))
        .limit(limit)
        .all()
    )
    apps = (
        db.query(LoanApplication)
        .options(joinedload(LoanApplication.customer), joinedload(LoanApplication.executive))
        .filter(or_(LoanApplication.reference_number.ilike(like), LoanApplication.application_number.ilike(like)))
        .limit(limit)
        .all()
    )
    execs = db.query(Executive).filter(Executive.name.ilike(like)).limit(limit).all()
    return {
        "customers": [{"id": c.id, "name": c.name, "mobile": c.mobile, "email": c.email} for c in customers],
        "applications": [{"id": a.id, "ref": a.reference_number, "name": (a.customer.name if a.customer else ""), "status": a.status} for a in apps],
        "executives": [{"id": e.id, "name": e.name, "email": e.email} for e in execs],
    }


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

    # last 12 calendar months, applications + disbursed value
    months = []
    now = datetime.now(timezone.utc)
    for i in range(11, -1, -1):
        start = _month_start(now, -i)
        end = _month_start(now, -i + 1)
        n = (
            db.query(func.count(LoanApplication.id))
            .filter(LoanApplication.created >= start, LoanApplication.created < end)
            .scalar() or 0
        )
        disb = (
            db.query(func.coalesce(func.sum(LoanApplication.amount), 0))
            .filter(LoanApplication.disbursed_at >= start, LoanApplication.disbursed_at < end)
            .scalar() or 0
        )
        months.append({"label": start.strftime("%b"), "n": n, "disbursed": disb})

    processing_days = (
        db.query(
            func.avg(
                func.extract("epoch", LoanApplication.disbursed_at - LoanApplication.created) / 86400.0
            )
        )
        .filter(LoanApplication.status == "disbursed", LoanApplication.disbursed_at.isnot(None))
        .scalar()
    )
    approved_total = by_status.get("approved", 0) + by_status.get("disbursed", 0) + by_status.get("closed", 0)

    return {
        "total": count(),
        "today": db.query(func.count(LoanApplication.id)).filter(LoanApplication.created >= today_start).scalar() or 0,
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
        "conversionRate": round((approved_total / count()) * 100, 1) if count() else 0,
        "avgProcessingDays": round(float(processing_days or 0), 1),
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
    executive_id: Optional[int] = None,
    from_ts: Optional[int] = None,
    to_ts: Optional[int] = None,
    city: str = "",
    ids: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(LoanApplication).join(Customer, isouter=True).options(joinedload(LoanApplication.customer), joinedload(LoanApplication.executive))
    if ids:
        wanted = [x for x in ids.split(",") if x.strip().isdigit()]
        if wanted:
            q = q.filter(LoanApplication.id.in_([int(x) for x in wanted]))
        else:
            raise HTTPException(status_code=422, detail="No valid application ids supplied")
    else:
        q = _apply_filters(q, search=search, loan_type=loan_type, status_=status, employment=employment, executive_id=executive_id, from_ts=from_ts, to_ts=to_ts, city=city)
    rows = q.order_by(LoanApplication.created.desc()).all()

    headers = [
        "Ref", "Application No", "Name", "Mobile", "Email", "PAN", "Gender", "DOB",
        "City", "State", "Pincode", "Address", "Employment", "Company", "Monthly Income",
        "Annual Household Income", "Entity Type", "Vintage", "GSTIN",
        "Loan", "Amount", "Tenure (months)", "Status", "Owner", "Source", "Device", "IP",
        "Created", "Updated", "Consent Terms", "Consent Privacy", "Consent Declaration",
    ]
    data = []
    for a in rows:
        c = a.customer
        data.append([
            a.reference_number, a.application_number,
            (c.name if c else ""), (c.mobile if c else ""), (c.email if c else ""), (c.pan if c else ""),
            (c.gender if c else ""), (c.dob if c else ""),
            (c.city if c else ""), (c.state if c else ""), (c.pincode if c else ""), (c.address if c else ""),
            (c.employment_type if c else ""), (c.company_name if c else ""),
            (c.monthly_income or ""), (c.annual_household_income or ""),
            (c.entity_type if c else ""), (c.vintage if c else ""), (c.gstin if c else ""),
            a.loan_label, a.amount, a.tenure_months, a.status,
            (a.executive.name if a.executive else ""), a.source, a.device or "", a.ip_address or "",
            a.created.strftime("%Y-%m-%d %H:%M") if a.created else "",
            a.updated_at.strftime("%Y-%m-%d %H:%M") if a.updated_at else "",
            "Yes" if (c and c.consent_terms) else "No",
            "Yes" if (c and c.consent_privacy) else "No",
            "Yes" if (c and c.consent_declaration) else "No",
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


# ---------- reports ----------
@router.get("/reports")
def reports(
    period: str = Query("month", pattern="^(day|week|month)$"),
    from_ts: Optional[int] = None,
    to_ts: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Executive performance, funnel, approval rate, loan distribution and revenue."""
    now = datetime.now(timezone.utc)
    buckets: list[tuple[datetime, datetime]] = []
    if period == "day":
        for i in range(13, -1, -1):
            start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
            buckets.append((start, start + timedelta(days=1)))
    elif period == "week":
        for i in range(7, -1, -1):
            start = (now - timedelta(days=i * 7)).replace(hour=0, minute=0, second=0, microsecond=0)
            buckets.append((start, start + timedelta(days=7)))
    else:
        for i in range(11, -1, -1):
            start = _month_start(now, -i)
            buckets.append((start, _month_start(now, -i + 1)))

    base = db.query(LoanApplication)
    if from_ts:
        base = base.filter(LoanApplication.created >= datetime.fromtimestamp(from_ts / 1000, tz=timezone.utc))
    if to_ts:
        base = base.filter(LoanApplication.created <= datetime.fromtimestamp(to_ts / 1000, tz=timezone.utc))

    total_rows = base.all()
    total = len(total_rows)
    funnel = {s: 0 for s in STATUS_LABELS}
    for a in total_rows:
        funnel[a.status] = funnel.get(a.status, 0) + 1
    approved_count = funnel.get("approved", 0) + funnel.get("disbursed", 0) + funnel.get("closed", 0)

    exec_rows = (
        db.query(Executive, func.count(LoanApplication.id).label("n"), func.sum(LoanApplication.amount).label("amt"))
        .join(LoanApplication, LoanApplication.assigned_to == Executive.id, isouter=True)
        .group_by(Executive.id)
        .order_by(func.count(LoanApplication.id).desc())
        .all()
    )
    execs = [
        {
            "name": e.name,
            "applications": n,
            "value": int(amt or 0),
            "active": e.enabled,
        }
        for e, n, amt in exec_rows
    ]

    distribution = {}
    for a in total_rows:
        distribution[a.loan_type] = distribution.get(a.loan_type, 0) + 1

    revenue = [
        {"label": buckets[i][0].strftime("%b %d" if period == "day" else "%b %d"), "applications": 0, "disbursed": 0}
        for i in range(len(buckets))
    ]
    for i, (start, end_dt) in enumerate(buckets):
        revenue[i]["applications"] = (
            db.query(func.count(LoanApplication.id))
            .filter(LoanApplication.created >= start, LoanApplication.created < end_dt)
            .scalar() or 0
        )
        revenue[i]["disbursed"] = (
            db.query(func.coalesce(func.sum(LoanApplication.amount), 0))
            .filter(LoanApplication.disbursed_at >= start, LoanApplication.disbursed_at < end_dt)
            .scalar() or 0
        )

    return {
        "period": period,
        "total": total,
        "conversionRate": round((approved_count / total) * 100, 1) if total else 0,
        "rejectionRate": round((funnel.get("rejected", 0) / total) * 100, 1) if total else 0,
        "funnel": [{"id": s, "label": l, "count": funnel[s]} for s, l in STATUS_LABELS.items()],
        "executives": execs,
        "distribution": [{"id": k, "label": l, "count": distribution.get(k, 0)}
                         for k, l in [("personal", "Personal Loan"), ("business", "Business Loan"), ("home", "Home Loan"), ("lap", "Loan Against Property")]],
        "revenue": revenue,
    }


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