"""SQLAlchemy ORM models for the Activ Paisa CRM.

Tables (per product spec):
    admins                       — the single administrative login
    executives                   — sales team members apps can be assigned to
    customers                    — the person applying for a loan
    loan_applications            — one application, the hub of the CRM
    application_status_history   — every status transition, append-only
    application_notes            — internal notes left by staff
    application_activity         — full audit/activity log
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Admin(Base):
    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(40), default="super_admin")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), default="")
    mobile: Mapped[str] = mapped_column(String(20), index=True)
    email: Mapped[str] = mapped_column(String(255), default="")
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(12), nullable=True, index=True)
    pincode: Mapped[str | None] = mapped_column(String(12), nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # employment profile
    employment_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    company_name: Mapped[str | None] = mapped_column(String(180), nullable=True)
    monthly_income: Mapped[BigInteger | None] = mapped_column(BigInteger, nullable=True)
    annual_household_income: Mapped[BigInteger | None] = mapped_column(BigInteger, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    vintage: Mapped[str | None] = mapped_column(String(40), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)

    consent_terms: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_privacy: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_declaration: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list["LoanApplication"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_customers_mobile_pan", "mobile", "pan"),)


class Executive(Base):
    __tablename__ = "executives"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(40), default="sales_executive")
    color: Mapped[str] = mapped_column(String(9), default="#0C6E6E")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list["LoanApplication"]] = relationship(back_populates="executive")


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    reference_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    loan_type: Mapped[str] = mapped_column(String(40), index=True)
    loan_label: Mapped[str] = mapped_column(String(80))
    amount: Mapped[BigInteger] = mapped_column(BigInteger, default=0)
    tenure_months: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="new", index=True)
    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("executives.id", ondelete="SET NULL"), nullable=True, index=True
    )
    source: Mapped[str] = mapped_column(String(40), default="website")
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    device: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    customer: Mapped[Customer | None] = relationship(back_populates="applications")
    executive: Mapped[Executive | None] = relationship(back_populates="applications")

    status_history: Mapped[list["ApplicationStatusHistory"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    notes: Mapped[list["ApplicationNote"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    activity: Mapped[list["ApplicationActivity"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("loan_applications.id", ondelete="CASCADE"), index=True
    )
    from_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    to_status: Mapped[str] = mapped_column(String(40))
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    changed_by: Mapped[str] = mapped_column(String(120), default="Admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped[LoanApplication] = relationship(back_populates="status_history")


class ApplicationNote(Base):
    __tablename__ = "application_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("loan_applications.id", ondelete="CASCADE"), index=True
    )
    text: Mapped[str] = mapped_column(String(2000))
    author: Mapped[str] = mapped_column(String(120), default="Admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped[LoanApplication] = relationship(back_populates="notes")


class ApplicationActivity(Base):
    __tablename__ = "application_activity"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(80))
    text: Mapped[str] = mapped_column(String(500))
    actor: Mapped[str] = mapped_column(String(120), default="System")
    meta: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    application: Mapped[LoanApplication | None] = relationship(back_populates="activity")