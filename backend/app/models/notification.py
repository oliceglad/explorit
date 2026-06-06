import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    actor_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    type = Column(String(32), nullable=False)          # like | comment | follow
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_type = Column(String(32), nullable=True)    # post | route | user
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    recipient = relationship("User", foreign_keys=[recipient_id], lazy="select")
    actor = relationship("User", foreign_keys=[actor_id], lazy="select")
