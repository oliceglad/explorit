import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    poi_id = Column(UUID(as_uuid=True), ForeignKey("poi.id", ondelete="CASCADE"), nullable=False, index=True)
    interaction_type = Column(String(32), nullable=False)  # view | visit | like | route_include
    rating = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", lazy="select")
    poi = relationship("POI", lazy="select")
