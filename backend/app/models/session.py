import uuid
import random
import string
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def _generate_invite_code() -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=8))


class GroupSession(Base):
    __tablename__ = "group_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    host_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    invite_code = Column(String(8), nullable=False, unique=True, default=_generate_invite_code)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)

    route = relationship("Route", lazy="select")
    host = relationship("User", lazy="select")
    members = relationship("SessionMember", back_populates="session", lazy="select")


class SessionMember(Base):
    __tablename__ = "session_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("group_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    last_lat = Column(Float, nullable=True)
    last_lon = Column(Float, nullable=True)
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    session = relationship("GroupSession", back_populates="members")
    user = relationship("User", lazy="select")
