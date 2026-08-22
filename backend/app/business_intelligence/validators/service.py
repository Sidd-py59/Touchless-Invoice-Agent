from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.timesheet import Timesheet, TimesheetStatus
from app.models.validation import ValidationResult, ValidationSeverity, ValidationStatus
from app.repositories.client_repository import ClientRepository
from app.repositories.timesheet_repository import TimesheetRepository
from app.repositories.validation_repository import ValidationRepository
from app.business_intelligence.validators.client_match_rule import ClientMatchRule
from app.business_intelligence.validators.duplicate_employee_rule import DuplicateEmployeeRule
from app.business_intelligence.validators.employee_exists_rule import EmployeeExistsRule
from app.business_intelligence.validators.overtime_rule import OvertimeRule
from app.business_intelligence.validators.working_days_rule import WorkingDaysRule


class ValidationService:
    """
    Validation Coordinator Service (Layer 2 - Business Intelligence).
    Clears prior logs, runs all validators across timesheet entries,
    and updates timesheet validation status.
    """

    @staticmethod
    async def validate_timesheet(
        db: AsyncSession, timesheet_id: int
    ) -> Timesheet:
        # 1. Fetch timesheet
        timesheet = await TimesheetRepository.get_by_id(db, timesheet_id)
        if not timesheet:
            raise ValueError(f"Timesheet with ID {timesheet_id} not found.")

        # 2. Fetch or create client configuration
        client_config = await ClientRepository.get_config(db, timesheet.client_id)
        if not client_config:
            client_config = await ClientRepository.create_config(
                db=db, client_id=timesheet.client_id
            )

        # 3. Fetch all entries
        entries = await TimesheetRepository.get_entries(db, timesheet_id)

        # 4. Wipe previous validation results for these entries to avoid duplicates on re-runs
        for entry in entries:
            stmt = delete(ValidationResult).where(
                ValidationResult.timesheet_entry_id == entry.id
            )
            await db.execute(stmt)

        # 5. Define rules to execute
        rules = [
            EmployeeExistsRule(),
            ClientMatchRule(),
            WorkingDaysRule(),
            DuplicateEmployeeRule(),
            OvertimeRule(),
        ]

        has_errors = False

        # 6. Execute rules for each entry
        for entry in entries:
            for rule in rules:
                result_dto = await rule.validate(db, entry, client_config)

                # Persist validation log
                await ValidationRepository.create(
                    db=db,
                    timesheet_entry_id=entry.id,
                    rule_name=result_dto.rule_name,
                    status=result_dto.status,
                    severity=result_dto.severity,
                    expected=result_dto.expected,
                    actual=result_dto.actual,
                    message=result_dto.message,
                    resolved=result_dto.resolved,
                    resolved_by=result_dto.resolved_by,
                )

                # Flag errors that block invoicing
                if (
                    result_dto.status == ValidationStatus.FAILED
                    and result_dto.severity == ValidationSeverity.ERROR
                ):
                    has_errors = True

        # 7. Update timesheet header state
        new_status = (
            TimesheetStatus.VALIDATION_PENDING
            if has_errors
            else TimesheetStatus.VALIDATED
        )
        await TimesheetRepository.update_status(db, timesheet.id, new_status)

        await db.commit()
        return timesheet
