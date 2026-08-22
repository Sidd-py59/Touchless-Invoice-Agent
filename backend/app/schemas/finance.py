from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


# --- Overview ---

class SourceBreakdown(BaseModel):
    source: str
    count: int


class FinanceOverview(BaseModel):
    total_documents: int
    documents_this_month: int
    pending_validation: int
    validated: int
    invoices_generated: int
    total_revenue: Decimal
    source_breakdown: list[SourceBreakdown]


# --- Documents ---

class DocumentListItem(BaseModel):
    id: int
    client_id: int
    client_name: str
    file_name: str
    source: str
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentDetail(BaseModel):
    id: int
    client_id: int
    client_name: str
    file_name: str
    file_path: str
    source: str
    mime_type: str
    status: str
    uploaded_at: datetime
    timesheet_id: int | None
    timesheet_status: str | None
    extraction_count: int

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[DocumentListItem]


# --- Timesheets ---

class ValidationResultItem(BaseModel):
    id: int
    rule_name: str
    status: str
    severity: str
    message: str
    expected: str | None
    actual: str | None
    resolved: bool

    class Config:
        from_attributes = True


class TimesheetEntryItem(BaseModel):
    id: int
    employee_id: int | None
    raw_employee_code: str | None
    raw_employee_name: str | None
    working_days: Decimal
    ot_hours: Decimal
    leave_days: Decimal
    confidence: float
    validation_results: list[ValidationResultItem]

    class Config:
        from_attributes = True


class TimesheetListItem(BaseModel):
    id: int
    client_id: int
    client_name: str
    billing_period: str
    status: str
    entry_count: int
    error_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class TimesheetDetail(BaseModel):
    id: int
    client_id: int
    client_name: str
    billing_period: str
    status: str
    document_id: int | None
    entries: list[TimesheetEntryItem]

    class Config:
        from_attributes = True


class TimesheetListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[TimesheetListItem]


# --- Invoices ---

class InvoiceItemDetail(BaseModel):
    id: int
    employee_id: int
    gross_salary: Decimal
    ot_amount: Decimal
    allowance: Decimal
    deduction: Decimal
    bill_amount: Decimal

    class Config:
        from_attributes = True


class InvoiceListItem(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    billing_period: str
    grand_total: Decimal
    currency: str
    status: str
    approval_status: str
    generated_at: datetime

    class Config:
        from_attributes = True


class InvoiceDetail(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    billing_period: str
    invoice_date: str
    due_date: str
    currency: str
    subtotal: Decimal
    service_charge: Decimal
    tax: Decimal
    grand_total: Decimal
    status: str
    approval_status: str
    approved_by: str | None
    invoice_pdf_path: str | None
    items: list[InvoiceItemDetail]

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[InvoiceListItem]


class GenerateInvoiceResponse(BaseModel):
    invoice_id: int
    invoice_number: str
    grand_total: Decimal
    currency: str
    status: str


# --- Clients ---

class CreateClientRequest(BaseModel):
    name: str
    email: str | None = None
    billing_address: str | None = None
    city: str | None = None
    industry: str | None = None


class EmployeeListItem(BaseModel):
    id: int
    employee_code: str
    first_name: str
    last_name: str
    email: str | None
    is_active: bool
    basic_salary: Decimal | None
    allowance: Decimal | None

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    total: int
    items: list[EmployeeListItem]


class CreateEmployeeRequest(BaseModel):
    employee_code: str
    first_name: str
    last_name: str
    email: str | None = None
    basic_salary: Decimal
    housing: Decimal = Decimal("0")
    transport: Decimal = Decimal("0")
    food: Decimal = Decimal("0")
    phone: Decimal = Decimal("0")
    deduction: Decimal = Decimal("0")
    ot_rate_per_hour: Decimal = Decimal("0")
    currency: str = "AED"


class ClientListItem(BaseModel):
    id: int
    name: str
    email: str | None
    is_active: bool
    employee_count: int
    document_count: int
    invoice_count: int

    class Config:
        from_attributes = True


class ClientDetail(BaseModel):
    id: int
    name: str
    email: str | None
    billing_address: str | None
    is_active: bool
    total_revenue: Decimal
    employee_count: int
    document_count: int
    invoice_count: int

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    total: int
    items: list[ClientListItem]


class ClientConfigSchema(BaseModel):
    id: int
    client_id: int
    currency: str
    service_charge_percentage: Decimal
    tax_percentage: Decimal
    invoice_prefix: str
    dispatch_method: str
    validation_profile: str
    brand_color: str
    payment_terms_days: int
    invoice_notes: str | None
    logo_url: str | None

    class Config:
        from_attributes = True


class UpdateClientConfigRequest(BaseModel):
    currency: str | None = None
    service_charge_percentage: Decimal | None = None
    tax_percentage: Decimal | None = None
    invoice_prefix: str | None = None
    dispatch_method: str | None = None
    brand_color: str | None = None
    payment_terms_days: int | None = None
    invoice_notes: str | None = None
    logo_url: str | None = None


# --- Client Portal ---

class PortalOverview(BaseModel):
    client_id: int
    client_name: str
    total_invoices: int
    outstanding_amount: Decimal
    last_upload_at: datetime | None
    pending_documents: int


class PortalInvoiceListItem(BaseModel):
    id: int
    invoice_number: str
    billing_period: str
    grand_total: Decimal
    currency: str
    status: str
    generated_at: datetime
    has_pdf: bool

    class Config:
        from_attributes = True


class PortalDocumentItem(BaseModel):
    id: int
    file_name: str
    source: str
    status: str
    uploaded_at: datetime

    class Config:
        from_attributes = True


# --- Client Queries ---

class QueryCreate(BaseModel):
    subject: str
    body: str
    invoice_id: int | None = None


class QueryListItem(BaseModel):
    id: int
    client_id: int
    client_name: str
    invoice_id: int | None
    subject: str
    body: str
    status: str
    resolution_note: str | None
    resolved_by: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class QueryListResponse(BaseModel):
    total: int
    items: list[QueryListItem]


class ResolveQueryRequest(BaseModel):
    resolution_note: str
    resolved_by: str = "finops_team"


# --- Analytics ---

class MonthlyCount(BaseModel):
    month: str
    value: int


class MonthlyAccuracy(BaseModel):
    week: str
    aiAccuracy: float
    processingTime: float


class AnalyticsData(BaseModel):
    invoices_generated: list[MonthlyCount]
    processing_and_accuracy: list[MonthlyAccuracy]
