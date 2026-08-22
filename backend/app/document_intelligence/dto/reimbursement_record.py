from decimal import Decimal
from pydantic import BaseModel


class ReimbursementRecord(BaseModel):
    """
    Unified representation of a single employee reimbursement/claims item
    parsed from a document.
    """

    amount: Decimal = Decimal("0.00")
    reason: str
    type: str  # e.g., "TRAVEL", "FOOD", "INTERNET"
    confidence: float = 1.0
