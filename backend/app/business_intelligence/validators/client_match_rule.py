from sqlalchemy.ext.asyncio import AsyncSession
from app.models.client_config import ClientConfig
from app.models.timesheet import TimesheetEntry
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.repositories.employee_repository import EmployeeRepository
from app.business_intelligence.validators.base_rule import BaseRule


class ClientMatchRule(BaseRule):
    """
    Validation Rule: Client Mismatch.
    Checks if the employee belongs to the client specified on the timesheet.
    """

    @property
    def rule_name(self) -> str:
        return "Client Mismatch"

    async def validate(
        self, db: AsyncSession, entry: TimesheetEntry, client_config: ClientConfig
    ) -> ValidationResult:
        if entry.employee_id is None:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected="N/A",
                actual="N/A",
                message="Skipped: Employee not resolved.",
            )

        employee = await EmployeeRepository.get_by_id(db, entry.employee_id)
        if employee and employee.client_id == client_config.client_id:
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.PASSED,
                severity=ValidationSeverity.INFO,
                expected=str(client_config.client_id),
                actual=str(employee.client_id),
                message="Employee matches timesheet client.",
            )
        else:
            actual_client = str(employee.client_id) if employee else "None"
            return ValidationResult(
                timesheet_entry_id=entry.id,
                rule_name=self.rule_name,
                status=ValidationStatus.FAILED,
                severity=ValidationSeverity.ERROR,
                expected=str(client_config.client_id),
                actual=actual_client,
                message=f"Employee client ID mismatch (Expected: {client_config.client_id}, Found: {actual_client}).",
            )
