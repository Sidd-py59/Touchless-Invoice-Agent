from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.business_intelligence.validators.base_rule import BaseRule


class EmployeeExistsRule(BaseRule):
    """
    Validation Rule: Employee Not Found.
    Checks if the employee was resolved to a database master record.
    """

    @property
    def rule_name(self) -> str:
        return "Employee Not Found"

    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        if entry.employee_id is not None:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected=str(entry.raw_employee_code),
                actual=str(entry.raw_employee_code),
                message="Employee resolved in TASC Master Data.",
            )
        else:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.FAILED,
                severity=ValidationSeverity.ERROR,
                expected="Valid Employee Record",
                actual="None",
                message=f"Employee '{entry.raw_employee_name or ''}' (Code: {entry.raw_employee_code or 'N/A'}) was not found in TASC Master Data.",
            )
