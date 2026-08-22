from decimal import Decimal
from pydantic import BaseModel, Field


class NormalizedExtractionDTO(BaseModel):
    """
    Data Transfer Object representing a single raw cell or field extraction.
    Captured from Excel or OCR bounding boxes.
    """

    field_name: str
    field_value: str
    confidence: float = 1.0
    page: int | None = None
    bbox: str | None = None  # JSON string or coord description
    row_number: int | None = None
    column_name: str | None = None
    entity_type: str | None = None  # e.g., "Employee", "OT", "Working Days"


class NormalizedEmployeeEntryDTO(BaseModel):
    """
    Data Transfer Object representing a single employee's attendance record
    extracted from the sheet.
    """

    raw_employee_code: str | None = None
    raw_employee_name: str | None = None
    working_days: Decimal = Decimal("0.00")
    ot_hours: Decimal = Decimal("0.00")
    leave_days: Decimal = Decimal("0.00")
    remarks: str | None = None
    confidence: float = 1.0
    extractions: list[NormalizedExtractionDTO] = Field(default_factory=list)


class NormalizedDocumentDTO(BaseModel):
    """
    Data Transfer Object representing the entire parsed output of a document.
    """

    client_name: str
    billing_year: int
    billing_month: int
    raw_extractions: list[NormalizedExtractionDTO] = Field(default_factory=list)
    entries: list[NormalizedEmployeeEntryDTO] = Field(default_factory=list)
