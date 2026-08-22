from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.business_intelligence.validators.base_rule import BaseRule


class DuplicateEmployeeRule(BaseRule):
    """
    Validation Rule: Duplicate Employee.
    Verifies if an employee appears multiple times in the same timesheet.
    """

    @property
    def rule_name(self) -> str:
        return "Duplicate Employee"

    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        if entry.employee_id:
            query = select(func.count(TimesheetEntry.id)).where(
                TimesheetEntry.timesheet_id == entry.timesheet_id,
                TimesheetEntry.employee_id == entry.employee_id,
            )
            expected_desc = f"1 occurrence (ID: {entry.employee_id})"
        elif entry.raw_employee_code:
            query = select(func.count(TimesheetEntry.id)).where(
                TimesheetEntry.timesheet_id == entry.timesheet_id,
                TimesheetEntry.raw_employee_code == entry.raw_employee_code,
            )
            expected_desc = f"1 occurrence (Code: {entry.raw_employee_code})"
        else:
            query = select(func.count(TimesheetEntry.id)).where(
                TimesheetEntry.timesheet_id == entry.timesheet_id,
                TimesheetEntry.raw_employee_name == entry.raw_employee_name,
            )
            expected_desc = f"1 occurrence (Name: {entry.raw_employee_name})"

        result = await db.execute(query)
        count = result.scalar() or 0

        if count <= 1:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected=expected_desc,
                actual=f"{count} occurrence",
                message="Employee is unique in this timesheet.",
            )
        else:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.FAILED,
                severity=ValidationSeverity.ERROR,
                expected=expected_desc,
                actual=f"{count} occurrences",
                message=f"Duplicate Employee: Employee appears {count} times in the timesheet.",
            )
