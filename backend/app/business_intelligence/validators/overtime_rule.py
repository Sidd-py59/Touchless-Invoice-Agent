from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.business_intelligence.validators.base_rule import BaseRule


class OvertimeRule(BaseRule):
    """
    Validation Rule: Overtime Hours.
    Validates if an employee's overtime hours exceed the client configuration threshold.
    """

    @property
    def rule_name(self) -> str:
        return "Overtime Hours"

    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        max_ot = client_config.max_ot_hours
        if entry.ot_hours <= max_ot:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected=f"<= {max_ot}",
                actual=str(entry.ot_hours),
                message="Overtime hours are within limits.",
            )
        else:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.FAILED,
                severity=ValidationSeverity.WARNING,
                expected=f"<= {max_ot}",
                actual=str(entry.ot_hours),
                message=f"Overtime hours ({entry.ot_hours}) exceeds maximum allowed ({max_ot}).",
            )
