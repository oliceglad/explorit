import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Boolean, DateTime, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry

from app.database import Base


class POI(Base):
    __tablename__ = "poi"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=False, index=True)
    address = Column(String(512), nullable=True)
    location = Column(Geometry("POINT", srid=4326, spatial_index=False), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    rating = Column(Float, nullable=False, default=0.0)
    photo_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    source = Column(String(64), nullable=True)
    external_id = Column(String(255), nullable=True)
    opening_hours = Column(String(512), nullable=True)
    website = Column(String(512), nullable=True)
    phone = Column(String(64), nullable=True)
    fetched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_poi_location", "location", postgresql_using="gist"),
        UniqueConstraint("external_id", name="uq_poi_external_id"),
    )
