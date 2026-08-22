from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import DocumentStatus
from app.models.employee import Employee
from app.models.timesheet import Timesheet
from app.repositories.client_repository import ClientRepository
from app.repositories.document_repository import DocumentRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.timesheet_repository import TimesheetRepository
from app.document_intelligence.dto.normalized_document import NormalizedDocument


class NormalizationService:
    """
    Normalization Service (Layer 2 - Business Intelligence).
    Coordinates client/employee master data resolution and database ingestion
    from NormalizedDocument DTO objects.

    A document may contain rows for several clients (mixed payroll sheet).
    Rows are grouped by the resolved employee's client and one timesheet is
    created per client, so each client gets its own invoice downstream.
    """

    @staticmethod
    async def normalize(
        db: AsyncSession, document_id: int, dto: NormalizedDocument
    ) -> list[Timesheet]:
        # 1. Retrieve the document upload record
        doc = await DocumentRepository.get_by_id(db, document_id)
        if not doc:
            raise ValueError(f"Document with ID {document_id} not found.")

        # 2. Retrieve client master information (default client for unresolved rows)
        client = await ClientRepository.get_by_id(db, doc.client_id)
        if not client:
            raise ValueError(f"Client with ID {doc.client_id} not found.")

        # 3. Parse billing year and month from billing_month string (e.g. "2026-06")
        billing_year = 2026
        billing_month = 6
        if dto.metadata.billing_month:
            parts = dto.metadata.billing_month.split("-")
            if len(parts) == 2:
                try:
                    billing_year = int(parts[0])
                    billing_month = int(parts[1])
                except ValueError:
                    pass

        # 4. Save Global Warnings / Parse Logs
        for warning_msg in dto.metadata.warnings:
            await DocumentRepository.create_extraction(
                db=db,
                document_id=doc.id,
                field_name="warning",
                field_value=warning_msg,
                confidence=1.0,
                entity_type="MetadataLog",
                source=dto.metadata.parser,
            )

        # 5. Resolve each row's employee and group rows by their actual client.
        #    Rows whose employee cannot be resolved stay under the document's client.
        grouped: dict[int, list[tuple]] = {}
        for entry_dto in dto.employees:
            employee = await NormalizationService._resolve_employee(
                db, entry_dto, client.id
            )
            target_client_id = employee.client_id if employee else client.id
            grouped.setdefault(target_client_id, []).append((entry_dto, employee))

        # Keep the document's own client first so it stays the primary timesheet.
        ordered_client_ids = sorted(
            grouped.keys(), key=lambda cid: (cid != client.id,)
        )
        if not ordered_client_ids:
            # Document parsed but produced zero rows: keep one empty timesheet
            # under the document's client (previous behaviour).
            ordered_client_ids = [client.id]
            grouped[client.id] = []

        # 6. Create one timesheet per client with its entries and cell extractions
        timesheets: list[Timesheet] = []
        for target_client_id in ordered_client_ids:
            timesheet = await TimesheetRepository.create(
                db=db,
                client_id=target_client_id,
                billing_year=billing_year,
                billing_month=billing_month,
                document_id=doc.id,
            )
            timesheets.append(timesheet)

            for entry_dto, employee in grouped[target_client_id]:
                employee_id = employee.id if employee else None

                # Create Timesheet entry row
                await TimesheetRepository.create_entry(
                    db=db,
                    timesheet_id=timesheet.id,
                    employee_id=employee_id,
                    raw_employee_code=entry_dto.employee_code,
                    raw_employee_name=entry_dto.employee_name,
                    working_days=entry_dto.working_days,
                    ot_hours=entry_dto.ot_hours,
                    leave_days=entry_dto.leave_days,
                    remarks=entry_dto.remarks,
                    confidence=entry_dto.confidence,
                    salary_basic=entry_dto.salary_basic,
                    salary_allowance=entry_dto.salary_allowance,
                    salary_deduction=entry_dto.salary_deduction,
                    salary_ot_amount=entry_dto.salary_ot_amount,
                )

                # Save cell extraction details for auditing
                fields_to_extract = {
                    "employee_code": entry_dto.employee_code,
                    "employee_name": entry_dto.employee_name,
                    "working_days": str(entry_dto.working_days),
                    "ot_hours": str(entry_dto.ot_hours),
                    "leave_days": str(entry_dto.leave_days),
                }
                for field, val in fields_to_extract.items():
                    if val is not None:
                        await DocumentRepository.create_extraction(
                            db=db,
                            document_id=doc.id,
                            field_name=field,
                            field_value=val,
                            confidence=entry_dto.confidence,
                            entity_type="EmployeeRecord",
                            source=dto.metadata.parser,
                        )

        # Update Document upload status
        await DocumentRepository.update_status(db, doc.id, DocumentStatus.PARSED)

        await db.flush()
        return timesheets

    @staticmethod
    async def _resolve_employee(
        db: AsyncSession, entry_dto, default_client_id: int
    ) -> Employee | None:
        # Primary: employee code is globally unique in the master
        if entry_dto.employee_code:
            employee = await EmployeeRepository.get_by_code(
                db, entry_dto.employee_code
            )
            if employee:
                return employee

        # Secondary/Fallback: scan by first name/last name similarity
        if not entry_dto.employee_name:
            return None

        parts = entry_dto.employee_name.strip().split(maxsplit=1)
        first_name = parts[0] if len(parts) > 0 else ""
        last_name = parts[1] if len(parts) > 1 else ""

        # Prefer a match under the document's client
        query = select(Employee).where(
            Employee.client_id == default_client_id,
            Employee.first_name.ilike(first_name),
            Employee.last_name.ilike(last_name),
        )
        res = await db.execute(query)
        employee = res.scalars().first()
        if employee:
            return employee

        # Otherwise accept a global name match only when it is unambiguous
        global_query = select(Employee).where(
            Employee.first_name.ilike(first_name),
            Employee.last_name.ilike(last_name),
        )
        res = await db.execute(global_query)
        matches = list(res.scalars().all())
        if len(matches) == 1:
            return matches[0]
        return None
