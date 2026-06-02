import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry

from app.database import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(512), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=True, index=True)
    address = Column(String(512), nullable=True)
    location = Column(Geometry("POINT", srid=4326, spatial_index=False), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    poi_id = Column(UUID(as_uuid=True), ForeignKey("poi.id", ondelete="SET NULL"), nullable=True)
    date_begin = Column(DateTime, nullable=True)
    date_end = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    source = Column(String(64), nullable=True, index=True)
    external_id = Column(String(255), nullable=True)
    photo_url = Column(String(512), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    poi = relationship("POI", lazy="select")
