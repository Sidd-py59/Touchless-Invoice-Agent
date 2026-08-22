from typing import Any
from pydantic import BaseModel, Field

from app.document_intelligence.dto.document_metadata import DocumentMetadata
from app.document_intelligence.dto.employee_record import EmployeeRecord
from app.document_intelligence.dto.reimbursement_record import ReimbursementRecord


class NormalizedDocument(BaseModel):
    """
    The unified root DTO returned by the Document Intelligence Layer.
    Aggregates metadata, parsed employees, attendance punch stubs, and claims.
    """

    metadata: DocumentMetadata
    employees: list[EmployeeRecord] = Field(default_factory=list)
    attendance: list[Any] = Field(default_factory=list)  # Future punch-in/out records
    reimbursements: list[ReimbursementRecord] = Field(default_factory=list)
    extra_fields: dict[str, Any] = Field(default_factory=dict)  # Extensible capture bucket
