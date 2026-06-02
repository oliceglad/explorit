import pygeohash


def encode(lat: float, lon: float, precision: int = 6) -> str:
    return pygeohash.encode(lat, lon, precision)


def decode(gh: str) -> tuple[float, float]:
    lat, lon = pygeohash.decode(gh)
    return float(lat), float(lon)


def neighbors(gh: str) -> list[str]:
    # pygeohash возвращает dict {'n': ..., 'ne': ..., ...}
    return list(pygeohash.neighbors(gh).values())
