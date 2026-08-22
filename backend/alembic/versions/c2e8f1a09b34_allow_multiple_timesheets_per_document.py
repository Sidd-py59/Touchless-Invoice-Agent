"""allow_multiple_timesheets_per_document

Revision ID: c2e8f1a09b34
Revises: a1b2c3d4e5f6
Create Date: 2026-07-03 17:30:00.000000

Drops the UNIQUE constraint on timesheets.document_id so a mixed payroll
document spanning several clients can produce one timesheet per client.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2e8f1a09b34'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The original constraint was created unnamed (inline UNIQUE on the column).
# SQLite batch mode needs a naming convention to address it for dropping.
naming_convention = {
    "uq": "uq_%(table_name)s_%(column_0_name)s",
}


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table(
        'timesheets', schema=None, naming_convention=naming_convention
    ) as batch_op:
        batch_op.drop_constraint('uq_timesheets_document_id', type_='unique')
        batch_op.create_index(
            batch_op.f('ix_timesheets_document_id'), ['document_id'], unique=False
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table(
        'timesheets', schema=None, naming_convention=naming_convention
    ) as batch_op:
        batch_op.drop_index(batch_op.f('ix_timesheets_document_id'))
        batch_op.create_unique_constraint(
            'uq_timesheets_document_id', ['document_id']
        )
