from typing import Any

from app.algorithms.haversine import haversine


def nearest_neighbor(start_lat: float, start_lon: float, points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Greedy nearest-neighbor ordering of points starting from (start_lat, start_lon)."""
    if not points:
        return []

    remaining = list(points)
    ordered = []
    cur_lat, cur_lon = start_lat, start_lon

    while remaining:
        closest = min(remaining, key=lambda p: haversine(cur_lat, cur_lon, p["lat"], p["lon"]))
        ordered.append(closest)
        remaining.remove(closest)
        cur_lat, cur_lon = closest["lat"], closest["lon"]

    return ordered
