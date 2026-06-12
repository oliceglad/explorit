"""add distance_walked_km to user_progress

Revision ID: a1b2c3d4e5f6
Revises: 144901693d60
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '144901693d60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'user_progress',
        sa.Column('distance_walked_km', sa.Float(), nullable=False, server_default='0.0'),
    )


def downgrade() -> None:
    op.drop_column('user_progress', 'distance_walked_km')
