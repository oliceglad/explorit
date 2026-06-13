"""add user profile fields (full_name, city)

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-13
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('full_name', sa.String(128), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(128), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'city')
    op.drop_column('users', 'full_name')
