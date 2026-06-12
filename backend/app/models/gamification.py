import uuid
from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

XP_REWARDS = {
    "route_completed": 100,
    "new_place_discovered": 30,
    "cooperative_route": 40,
    "streak_5_days": 20,
    "post_published": 15,
    "first_visit_category": 50,
}

LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3100, 4200, 5500, 7000,
                    8800, 11000, 13500, 16500, 20000, 24000, 28500, 33500, 39000]

LEVEL_NAMES = {
    1: "Новый житель",
    2: "Любопытный горожанин",
    3: "Исследователь улиц",
    5: "Знаток района",
    8: "Самарский пешеход",
    12: "Хранитель города",
    16: "Легенда Самары",
    20: "Мастер маршрутов",
}


def xp_to_level(xp: int) -> int:
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
    return min(level, len(LEVEL_THRESHOLDS))


def level_name(level: int) -> str:
    for lvl in sorted(LEVEL_NAMES.keys(), reverse=True):
        if level >= lvl:
            return LEVEL_NAMES[lvl]
    return LEVEL_NAMES[1]


class UserProgress(Base):
    __tablename__ = "user_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    xp = Column(Integer, nullable=False, default=0)
    level = Column(Integer, nullable=False, default=1)
    routes_completed = Column(Integer, nullable=False, default=0)
    places_discovered = Column(Integer, nullable=False, default=0)
    distance_walked_km = Column(Float, nullable=False, default=0.0)
    current_streak = Column(Integer, nullable=False, default=0)
    last_activity_date = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="progress")
