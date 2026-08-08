"""Pydantic schemas for the API."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------- auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class TokenPayload(BaseModel):
    sub: str
    name: str
    role: str
    exp: int


class MeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    enabled: bool


class AdminSeed(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = "Admin"


# ---------- public submission ----------
class CustomerSubmit(BaseModel):
    name: str = ""
    mobile: str = ""
    email: str = ""
    gender: str = ""
    dob: str = ""
    pan: str = ""
    pincode: str = ""
    city: str = ""
    address: str = ""
    employment: str = ""
    company: str = ""
    income: Optional[str] = None
    household: Optional[str] = None
    entityType: Optional[str] = None
    vintage: Optional[str] = None
    gstin: Optional[str] = None


class ApplicationSubmit(BaseModel):
    loanType: str = ""
    loanLabel: str = ""
    amount: int = 0
    tenureMonths: int = 0
    customer: CustomerSubmit = Field(default_factory=CustomerSubmit)
    consentTerms: bool = False
    consentPrivacy: bool = False
    consentDeclaration: bool = False
    docs: list[dict[str, Any]] = Field(default_factory=list)
    source: str = "website"
    requestedRef: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_gte_zero(cls, v: int) -> int:
        return max(0, int(v or 0))


class ApplicationSubmitResponse(BaseModel):
    ok: bool = True
    id: int
    application_number: str
    reference_number: str
    submitted_at: datetime


# ---------- admin ----------
class StatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None


class AssignUpdate(BaseModel):
    executive_id: Optional[int] = None


class NoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ExecutiveCreate(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    role: str = "sales_executive"
    color: str = "#0C6E6E"


class ManualApplication(BaseModel):
    name: str = Field(default="", max_length=160)
    phone: str = Field(default="")
    email: str = Field(default="")
    pan: str = Field(default="")
    amount: int = 0
    loan_type: str = "personal"
    loan_label: str = ""
    tenure_months: int = 36
    executive_id: Optional[int] = None
    employment: str = ""
    city: str = ""