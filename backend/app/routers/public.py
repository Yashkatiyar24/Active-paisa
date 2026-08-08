"""Public intake endpoint — every website submission lands here.

No authentication: this is called by the public onboarding form. Input is
validated and sanitised before it is written to PostgreSQL.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..helpers import (
    client_ip,
    detect_device,
    log_activity,
    make_reference_number,
    next_application_number,
)
from ..models import Customer, LoanApplication
from ..schemas import ApplicationSubmit, ApplicationSubmitResponse

router = APIRouter(prefix="/api/v1/public", tags=["public"])


def _num(value) -> int:
    if value is None or value == "":
        return 0
    try:
        return int(float(str(value).replace(",", "").replace("₹", "").replace(",", "")))
    except (ValueError, TypeError):
        return 0


@router.post("/applications", response_model=ApplicationSubmitResponse)
def submit_application(body: ApplicationSubmit, request: Request, db: Session = Depends(get_db)):
    c = body.customer

    # Everyone who submits is a customer record. Match on mobile+pan so repeat
    # applicants get one row instead of a duplicate.
    customer = (
        db.query(Customer)
        .filter(Customer.mobile == c.mobile.strip(), Customer.pan == (c.pan or "").strip())
        .first()
    )
    if not customer:
        customer = Customer(mobile=c.mobile.strip(), pan=(c.pan or "").strip())
        db.add(customer)

    customer.name = c.name
    customer.email = (c.email or "").strip()
    customer.gender = c.gender
    customer.dob = c.dob
    customer.pincode = c.pincode
    customer.city = c.city
    customer.address = c.address
    customer.employment_type = c.employment if c.employment else None
    customer.company_name = c.company
    customer.monthly_income = _num(c.income) or None
    customer.annual_household_income = _num(c.household) or None
    customer.entity_type = c.entityType or None
    customer.vintage = c.vintage or None
    customer.gstin = c.gstin or None
    customer.consent_terms = bool(body.consentTerms)
    customer.consent_privacy = bool(body.consentPrivacy)
    customer.consent_declaration = bool(body.consentDeclaration)
    db.flush()

    ua = request.headers.get("user-agent", "")
    app = LoanApplication(
        application_number=_make_number(db),
        reference_number=make_reference_number(),
        customer_id=customer.id,
        loan_type=body.loanType or "personal",
        loan_label=body.loanLabel or "Personal Loan",
        amount=_num(body.amount),
        tenure_months=int(body.tenureMonths or 0),
        status="new",
        source=body.source or "website",
        ip_address=client_ip(request),
        user_agent=ua[:512],
        device=detect_device(ua),
        submitted_at=datetime.now(timezone.utc),
        created=datetime.now(timezone.utc),
    )
    db.add(app)
    db.flush()

    log_activity(db, app, "application_created", "Application submitted via activpaisa.com.", actor="Website")
    db.commit()

    return ApplicationSubmitResponse(
        id=app.id,
        application_number=app.application_number,
        reference_number=app.reference_number,
        submitted_at=app.submitted_at,
    )


def _make_number(db) -> str:
    # consistency: a monotonic, human-friendly application number
    seq = db.query(LoanApplication).count() + 1
    return f"AP{datetime.now(timezone.utc).strftime('%y%m%d')}-{seq:05d}"