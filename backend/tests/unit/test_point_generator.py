import math
import pytest
import asyncio

from app.algorithms.point_generator import generate_random_point, PointGenerationError
from app.algorithms.haversine import haversine

LAT, LON = 53.1959, 50.1002
RADIUS_KM = 5.0


@pytest.mark.asyncio
async def test_points_within_radius():
    for _ in range(100):
        lat, lon = await generate_random_point(LAT, LON, RADIUS_KM)
        dist_m = haversine(LAT, LON, lat, lon)
        assert dist_m <= RADIUS_KM * 1000 + 1, f"Point outside radius: {dist_m:.1f}m"


@pytest.mark.asyncio
async def test_zero_radius_raises():
    with pytest.raises(PointGenerationError):
        await generate_random_point(LAT, LON, 0)
