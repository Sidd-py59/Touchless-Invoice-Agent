from collections import Counter
from decimal import Decimal, InvalidOperation
from typing import Any, Dict

from app.document_intelligence.dto.employee_record import EmployeeRecord
from app.document_intelligence.dto.reimbursement_record import ReimbursementRecord


class SchemaMapper:
    """
    Schema Mapper.
    Translates raw parsed maps into standard DTO instances.
    Provides key alias checks to handle client variations.
    """

    DOCUMENT_METADATA_ALIASES = {
        "client_name": ["client_name", "client name", "customer_name", "customer name"],
        "client_code": ["client_code", "client code", "client_id", "client id", "customer_code", "customer code"],
        "billing_month": ["pay_period", "pay period", "billing_month", "billing month", "period"],
    }
    COLUMN_ALIASES = {
        "employee_code": [
            "employee code",
            "emp code",
            "code",
            "id",
            "employee id",
            "emp id",
            "employee_code",
        ],
        "employee_name": [
            "employee name",
            "emp name",
            "name",
            "full name",
            "employee_name",
            "emp_name",
        ],
        "working_days": [
            "working days",
            "work days",
            "days",
            "days worked",
            "working_days",
            "work_days",
        ],
        "ot_hours": [
            "ot hours",
            "ot",
            "overtime",
            "overtime hours",
            "ot_hours",
            "overtime_hours",
        ],
        "leave_days": [
            "leave days",
            "leaves",
            "vacation days",
            "off days",
            "leave_days",
            "leave_days_count",
        ],
        "remarks": [
            "remarks",
            "remark",
            "notes",
            "comments",
            "reason",
            "remarks_field",
        ],
        # Salary override columns — used when the file contains per-period salary data
        "salary_basic": ["basic", "basic salary", "base salary", "basic_salary"],
        "salary_ot_amount": ["ot amount", "overtime amount", "ot_amount", "overtime pay"],
        "salary_deduction": ["deductions", "deduction", "total deductions"],
        # Individual allowance components — summed into salary_allowance
        "_housing": ["housing", "housing allowance"],
        "_transport": ["transport", "transport allowance", "transportation"],
        "_food": ["food", "food allowance", "meal allowance"],
        "_phone": ["phone", "phone allowance", "mobile allowance"],
        # Or a single allowance column
        "salary_allowance": ["allowance", "total allowance", "allowances"],
    }

    @classmethod
    def apply_document_metadata(cls, metadata: Any, raw_rows: list[Dict[str, Any]]) -> None:
        """Populate document-level metadata from repeated table columns."""
        for field, aliases in cls.DOCUMENT_METADATA_ALIASES.items():
            values: list[str] = []
            normalized_aliases = {cls._normalize_header(alias) for alias in aliases}

            for raw_row in raw_rows:
                row_lower = {
                    cls._normalize_header(str(key)): value
                    for key, value in raw_row.items()
                    if key is not None
                }

                value = None
                for alias in normalized_aliases:
                    if alias in row_lower:
                        value = row_lower[alias]
                        break

                if value is None:
                    for key, candidate in row_lower.items():
                        if any(alias in key for alias in normalized_aliases):
                            value = candidate
                            break

                cleaned = cls._clean_string(value)
                if cleaned:
                    values.append(cleaned)

            if values:
                setattr(metadata, field, Counter(values).most_common(1)[0][0])

    @staticmethod
    def _normalize_header(value: str) -> str:
        return " ".join(value.strip().lower().replace("_", " ").split())

    @staticmethod
    def _clean_string(value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        if not text or text.lower() in {"none", "nan", "null"}:
            return None
        return text
    @classmethod
    def map_employee_row(
        cls, raw_row: Dict[str, Any], confidence: float = 1.0
    ) -> EmployeeRecord:
        """
        Transforms a raw dictionary row into a standard EmployeeRecord DTO.
        """
        row_lower = {
            k.strip().lower(): v for k, v in raw_row.items() if k is not None
        }

        mapped_data = {}
        for field, aliases in cls.COLUMN_ALIASES.items():
            value = None
            for alias in aliases:
                if alias in row_lower:
                    value = row_lower[alias]
                    break
            mapped_data[field] = value

        # Default working_days to 30.00 (standard full month) if the value is empty or not specified
        working_days_val = mapped_data.get("working_days")
        if working_days_val is None or str(working_days_val).strip() == "":
            working_days = Decimal("30.00")
        else:
            working_days = cls._to_decimal(working_days_val)

        # Resolve salary_allowance: prefer explicit allowance column, else sum individual components
        salary_allowance_val = mapped_data.get("salary_allowance")
        if salary_allowance_val is not None:
            salary_allowance = cls._to_decimal(salary_allowance_val)
        else:
            salary_allowance = (
                cls._to_decimal(mapped_data.get("_housing"))
                + cls._to_decimal(mapped_data.get("_transport"))
                + cls._to_decimal(mapped_data.get("_food"))
                + cls._to_decimal(mapped_data.get("_phone"))
            )

        salary_basic = cls._to_decimal(mapped_data.get("salary_basic")) if mapped_data.get("salary_basic") is not None else None
        salary_deduction = cls._to_decimal(mapped_data.get("salary_deduction")) if mapped_data.get("salary_deduction") is not None else None
        salary_ot_amount = cls._to_decimal(mapped_data.get("salary_ot_amount")) if mapped_data.get("salary_ot_amount") is not None else None

        # Only propagate salary overrides when meaningful values were actually found
        has_salary_data = salary_basic is not None and salary_basic > Decimal("0")

        return EmployeeRecord(
            employee_code=(
                str(mapped_data.get("employee_code")).strip()
                if mapped_data.get("employee_code") is not None
                else None
            ),
            employee_name=(
                str(mapped_data.get("employee_name")).strip()
                if mapped_data.get("employee_name") is not None
                else None
            ),
            working_days=working_days,
            ot_hours=cls._to_decimal(mapped_data.get("ot_hours")),
            leave_days=cls._to_decimal(mapped_data.get("leave_days")),
            remarks=(
                str(mapped_data.get("remarks")).strip()
                if mapped_data.get("remarks") is not None
                else None
            ),
            confidence=confidence,
            salary_basic=salary_basic if has_salary_data else None,
            salary_allowance=salary_allowance if has_salary_data else None,
            salary_deduction=salary_deduction if has_salary_data else None,
            salary_ot_amount=salary_ot_amount if has_salary_data else None,
        )

    @classmethod
    def map_reimbursement_row(
        cls, raw_row: Dict[str, Any], confidence: float = 1.0
    ) -> ReimbursementRecord:
        """
        Transforms a raw dictionary row into a standard ReimbursementRecord DTO.
        """
        row_lower = {
            k.strip().lower(): v for k, v in raw_row.items() if k is not None
        }

        amount_aliases = ["amount", "value", "cost", "price", "claim amount"]
        reason_aliases = ["reason", "description", "details", "remarks", "purpose"]
        type_aliases = ["type", "category", "reimbursement type", "claim type"]

        amount_val = None
        for alias in amount_aliases:
            if alias in row_lower:
                amount_val = row_lower[alias]
                break

        reason_val = None
        for alias in reason_aliases:
            if alias in row_lower:
                reason_val = row_lower[alias]
                break

        type_val = None
        for alias in type_aliases:
            if alias in row_lower:
                type_val = row_lower[alias]
                break

        return ReimbursementRecord(
            amount=cls._to_decimal(amount_val),
            reason=(
                str(reason_val).strip()
                if reason_val is not None
                else "Unknown Claim"
            ),
            type=(
                str(type_val).strip().upper()
                if type_val is not None
                else "GENERAL"
            ),
            confidence=confidence,
        )

    @staticmethod
    def _to_decimal(val: Any) -> Decimal:
        if val is None or str(val).strip() == "":
            return Decimal("0.00")
        if isinstance(val, (int, float)):
            return Decimal(str(val))
        try:
            return Decimal(str(val).strip())
        except (InvalidOperation, ValueError):
            return Decimal("0.00")
