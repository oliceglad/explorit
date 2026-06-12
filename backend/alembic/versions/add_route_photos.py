"""add photo_url and photos to routes

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-12

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('routes', sa.Column('photo_url', sa.String(512), nullable=True))
    op.add_column('routes', sa.Column('photos', JSONB(), nullable=True, server_default='[]'))


def downgrade() -> None:
    op.drop_column('routes', 'photos')
    op.drop_column('routes', 'photo_url')
