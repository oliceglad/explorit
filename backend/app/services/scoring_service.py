from typing import Any

W_CATEGORY = 0.40
W_RATING = 0.25
W_FRESHNESS = 0.20
W_EVENT = 0.15

EVENT_CATEGORY_BONUS = {
    "concert": 1.0,
    "exhibition": 0.9,
    "theatre": 0.9,
    "festival": 1.0,
    "sport": 0.7,
    "other": 0.5,
}


def score_and_rank(
    poi_list: list[Any],
    events: list[Any],
    user_interests: list[str],
    visited_ids: dict[str, int],
) -> list[tuple[Any, float]]:
    """Returns list of (poi, score) sorted by score descending."""
    event_poi_map: dict[str, float] = {}
    for ev in events:
        if ev.poi_id:
            cat = (ev.category or "other").lower()
            bonus = EVENT_CATEGORY_BONUS.get(cat, 0.5)
            pid = str(ev.poi_id)
            event_poi_map[pid] = max(event_poi_map.get(pid, 0.0), bonus)

    scored = []
    for poi in poi_list:
        pid = str(poi.id)
        category_match = 1.0 if poi.category in user_interests else 0.2
        rating_norm = min(poi.rating / 5.0, 1.0)
        freshness = 1.0 / (1.0 + visited_ids.get(pid, 0))
        event_bonus = event_poi_map.get(pid, 0.0)

        score = (
            W_CATEGORY * category_match +
            W_RATING * rating_norm +
            W_FRESHNESS * freshness +
            W_EVENT * event_bonus
        )
        scored.append((poi, score))

    return sorted(scored, key=lambda x: x[1], reverse=True)
