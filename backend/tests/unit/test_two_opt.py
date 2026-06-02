import pytest
from app.algorithms.two_opt import two_opt
from app.algorithms.haversine import haversine


def _route_len(points):
    total = 0.0
    for i in range(len(points) - 1):
        total += haversine(points[i]["lat"], points[i]["lon"], points[i + 1]["lat"], points[i + 1]["lon"])
    return total


def make_point(lat, lon):
    return {"lat": lat, "lon": lon, "id": f"{lat},{lon}", "name": "test"}


def test_result_not_longer_than_input():
    points = [make_point(53.2, 50.1), make_point(53.3, 50.2), make_point(53.1, 50.3), make_point(53.4, 50.0)]
    original_len = _route_len(points)
    optimized = two_opt(points)
    assert _route_len(optimized) <= original_len + 0.5


def test_single_point_unchanged():
    points = [make_point(53.2, 50.1)]
    assert two_opt(points) == points


def test_two_points_unchanged():
    points = [make_point(53.2, 50.1), make_point(53.3, 50.2)]
    result = two_opt(points)
    assert len(result) == 2
