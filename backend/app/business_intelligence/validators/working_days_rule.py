from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.business_intelligence.validators.base_rule import BaseRule


class WorkingDaysRule(BaseRule):
    """
    Validation Rule: Working Days.
    Validates if an employee's working days exceed the client configuration threshold.
    """

    @property
    def rule_name(self) -> str:
        return "Working Days"

    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        max_days = client_config.max_working_days
        if entry.working_days <= max_days:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected=f"<= {max_days}",
                actual=str(entry.working_days),
                message="Working days are within limits.",
            )
        else:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.FAILED,
                severity=ValidationSeverity.WARNING,
                expected=f"<= {max_days}",
                actual=str(entry.working_days),
                message=f"Working days ({entry.working_days}) exceeds maximum allowed ({max_days}).",
            )
