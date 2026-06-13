"""add post media fields

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('posts', sa.Column('photos', sa.JSON(), nullable=True))
    op.add_column('posts', sa.Column('place_name', sa.String(256), nullable=True))
    op.add_column('posts', sa.Column('place_lat', sa.Float(), nullable=True))
    op.add_column('posts', sa.Column('place_lon', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('posts', 'place_lon')
    op.drop_column('posts', 'place_lat')
    op.drop_column('posts', 'place_name')
    op.drop_column('posts', 'photos')
