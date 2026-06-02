import pytest
from app.algorithms.haversine import haversine

SAMARA_LAT, SAMARA_LON = 53.1959, 50.1002
MOSCOW_LAT, MOSCOW_LON = 55.7558, 37.6173


def test_same_point_is_zero():
    assert haversine(SAMARA_LAT, SAMARA_LON, SAMARA_LAT, SAMARA_LON) == 0.0


def test_samara_moscow_distance():
    dist_m = haversine(SAMARA_LAT, SAMARA_LON, MOSCOW_LAT, MOSCOW_LON)
    dist_km = dist_m / 1000
    assert abs(dist_km - 1042) / 1042 < 0.01, f"Expected ~1042 km, got {dist_km:.1f}"


def test_symmetry():
    d1 = haversine(SAMARA_LAT, SAMARA_LON, MOSCOW_LAT, MOSCOW_LON)
    d2 = haversine(MOSCOW_LAT, MOSCOW_LON, SAMARA_LAT, SAMARA_LON)
    assert abs(d1 - d2) < 0.001
