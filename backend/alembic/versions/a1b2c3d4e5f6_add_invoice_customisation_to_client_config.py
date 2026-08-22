"""add_invoice_customisation_to_client_config

Revision ID: a1b2c3d4e5f6
Revises: d9eb43bc0a80
Create Date: 2026-06-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'd9eb43bc0a80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('client_configs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('brand_color', sa.String(20), nullable=False, server_default='#1a56db'))
        batch_op.add_column(sa.Column('payment_terms_days', sa.Integer(), nullable=False, server_default='30'))
        batch_op.add_column(sa.Column('invoice_notes', sa.String(1000), nullable=True))
        batch_op.add_column(sa.Column('logo_url', sa.String(500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('client_configs', schema=None) as batch_op:
        batch_op.drop_column('logo_url')
        batch_op.drop_column('invoice_notes')
        batch_op.drop_column('payment_terms_days')
        batch_op.drop_column('brand_color')
