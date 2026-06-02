import math
import random
from typing import Optional


class PointGenerationError(Exception):
    pass


def _spherical_point(lat: float, lon: float, d_km: float, theta: float) -> tuple[float, float]:
    """Computes a new lat/lon from start point, distance and bearing using spherical trig."""
    R = 6371.0
    delta = d_km / R

    phi1 = math.radians(lat)
    lambda1 = math.radians(lon)

    phi2 = math.asin(
        math.sin(phi1) * math.cos(delta) +
        math.cos(phi1) * math.sin(delta) * math.cos(theta)
    )
    lambda2 = lambda1 + math.atan2(
        math.sin(theta) * math.sin(delta) * math.cos(phi1),
        math.cos(delta) - math.sin(phi1) * math.sin(phi2)
    )

    return math.degrees(phi2), math.degrees(lambda2)


async def generate_random_point(
    lat: float,
    lon: float,
    radius_km: float,
    db_session=None,
) -> tuple[float, float]:
    if radius_km <= 0:
        raise PointGenerationError("radius_km must be positive")

    for _ in range(50):
        u = random.uniform(0, 1)
        d = radius_km * math.sqrt(u)
        theta = random.uniform(0, 2 * math.pi)
        new_lat, new_lon = _spherical_point(lat, lon, d, theta)
        if db_session is None or not await _is_point_forbidden(new_lat, new_lon, db_session):
            return new_lat, new_lon

    raise PointGenerationError("Could not generate a valid point after 50 attempts")


async def _is_point_forbidden(lat: float, lon: float, db_session) -> bool:
    # Placeholder: no forbidden zones defined yet
    return False
