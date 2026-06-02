import json
from typing import Any
from uuid import UUID

import numpy as np
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

_CF_MATRIX_KEY = "cf_matrix"
_TOP_SIMILAR_USERS = 10
_MAX_BOOST = 0.2


async def get_cf_boost(
    user_id: str,
    poi_ids: list[str],
    db: AsyncSession,
    redis_client: aioredis.Redis,
) -> dict[str, float]:
    """Returns {poi_id: boost_value} in [0, 0.2] based on collaborative filtering."""
    matrix_json = await redis_client.get(_CF_MATRIX_KEY)
    if matrix_json:
        matrix_data = json.loads(matrix_json)
    else:
        matrix_data = await _build_matrix(db)

    if not matrix_data or user_id not in matrix_data.get("user_index", {}):
        return {pid: 0.0 for pid in poi_ids}

    user_index = matrix_data["user_index"]
    poi_index = matrix_data["poi_index"]
    matrix = np.array(matrix_data["matrix"])

    uid = user_index[user_id]
    user_vec = matrix[uid]

    similarities = []
    for other_uid, other_user_id in enumerate(user_index):
        if other_user_id == user_id:
            continue
        other_vec = matrix[other_uid]
        sim = _cosine_similarity(user_vec, other_vec)
        similarities.append((sim, other_uid))

    top_similar = sorted(similarities, key=lambda x: x[0], reverse=True)[:_TOP_SIMILAR_USERS]

    result = {}
    for pid in poi_ids:
        if pid not in poi_index:
            result[pid] = 0.0
            continue
        p_idx = poi_index[pid]
        weighted_sum = sum(sim * matrix[other_uid][p_idx] for sim, other_uid in top_similar)
        sim_sum = sum(abs(sim) for sim, _ in top_similar) or 1.0
        boost = min(weighted_sum / sim_sum * _MAX_BOOST, _MAX_BOOST)
        result[pid] = max(boost, 0.0)

    return result


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


async def _build_matrix(db: AsyncSession) -> dict:
    result = await db.execute(text(
        "SELECT user_id::text, poi_id::text, COUNT(*) as cnt FROM interactions GROUP BY user_id, poi_id"
    ))
    rows = result.fetchall()

    if not rows:
        return {}

    user_ids = list({r[0] for r in rows})
    poi_ids = list({r[1] for r in rows})
    user_index = {uid: i for i, uid in enumerate(user_ids)}
    poi_index = {pid: i for i, pid in enumerate(poi_ids)}

    matrix = np.zeros((len(user_ids), len(poi_ids)))
    for uid, pid, cnt in rows:
        matrix[user_index[uid]][poi_index[pid]] = float(cnt)

    return {
        "user_index": user_index,
        "poi_index": poi_index,
        "matrix": matrix.tolist(),
    }
