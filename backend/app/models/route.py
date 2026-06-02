import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Float, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Route(Base):
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    geometry = Column(Geometry("LINESTRING", srid=4326, spatial_index=False), nullable=True)
    points = Column(JSONB, nullable=False, default=list)
    distance_m = Column(Float, nullable=True)
    duration_min = Column(Integer, nullable=True)
    transport_mode = Column(String(32), nullable=False, default="walking")
    is_public = Column(Boolean, nullable=False, default=False)
    is_saved = Column(Boolean, nullable=False, default=False)
    invite_link = Column(String(64), nullable=True, unique=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = relationship("User", back_populates="routes")
    posts = relationship("Post", back_populates="route", lazy="select")
