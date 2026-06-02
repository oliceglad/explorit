from typing import Any

from app.algorithms.haversine import haversine

_IMPROVEMENT_THRESHOLD = 0.1  # meters
_MAX_ITERATIONS = 100


def _route_distance(points: list[dict]) -> float:
    total = 0.0
    for i in range(len(points) - 1):
        total += haversine(points[i]["lat"], points[i]["lon"], points[i + 1]["lat"], points[i + 1]["lon"])
    return total


def two_opt(points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(points) <= 2:
        return points

    best = list(points)
    improved = True
    iterations = 0

    while improved and iterations < _MAX_ITERATIONS:
        improved = False
        iterations += 1
        for i in range(1, len(best) - 1):
            for j in range(i + 1, len(best)):
                before = (
                    haversine(best[i - 1]["lat"], best[i - 1]["lon"], best[i]["lat"], best[i]["lon"]) +
                    haversine(best[j - 1]["lat"], best[j - 1]["lon"], best[j]["lat"], best[j]["lon"])
                    if j < len(best) else 0
                )
                after = (
                    haversine(best[i - 1]["lat"], best[i - 1]["lon"], best[j - 1]["lat"], best[j - 1]["lon"]) +
                    haversine(best[i]["lat"], best[i]["lon"], best[j]["lat"], best[j]["lon"])
                    if j < len(best) else 0
                )
                if before - after > _IMPROVEMENT_THRESHOLD:
                    best[i:j] = best[i:j][::-1]
                    improved = True

    return best
