from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.gamification import UserProgress, LEVEL_NAMES, level_name
from app.models.user import User
from app.schemas.gamification import UserProgressResponse, LeaderboardEntry, Challenge

router = APIRouter(prefix="/api/gamification", tags=["gamification"])

ACTIVE_CHALLENGES = [
    Challenge(id="c1", title="Первооткрыватель", description="Посетите 3 новых места", xp_reward=150),
    Challenge(id="c2", title="Социальная активность", description="Опубликуйте 5 постов", xp_reward=100),
    Challenge(id="c3", title="Недельная серия", description="Выходите 7 дней подряд", xp_reward=200),
]


@router.get("/progress", response_model=UserProgressResponse)
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserProgress).where(UserProgress.user_id == current_user.id))
    progress = result.scalar_one_or_none()

    if not progress:
        progress = UserProgress(user_id=current_user.id)
        db.add(progress)
        await db.flush()

    return UserProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        xp=progress.xp,
        level=progress.level,
        level_name=level_name(progress.level),
        routes_completed=progress.routes_completed,
        places_discovered=progress.places_discovered,
        current_streak=progress.current_streak,
        last_activity_date=progress.last_activity_date,
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserProgress, User)
        .join(User, User.id == UserProgress.user_id)
        .order_by(UserProgress.xp.desc())
        .limit(limit)
    )
    rows = result.fetchall()

    entries = []
    for rank, (progress, user) in enumerate(rows, start=1):
        entries.append(LeaderboardEntry(
            user_id=user.id,
            nickname=user.nickname,
            avatar_url=user.avatar_url,
            xp=progress.xp,
            level=progress.level,
            rank=rank,
        ))
    return entries


@router.get("/challenges", response_model=list[Challenge])
async def get_challenges(current_user: User = Depends(get_current_user)):
    return ACTIVE_CHALLENGES
