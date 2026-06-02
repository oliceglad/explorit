import asyncio
import functools
from typing import Callable

import redis.asyncio as aioredis

_STATE_CLOSED = "closed"
_STATE_OPEN = "open"
_STATE_HALF_OPEN = "half_open"


class CircuitBreakerOpenError(Exception):
    pass


def circuit_breaker(failure_threshold: int = 5, recovery_timeout: int = 60):
    def decorator(fn: Callable):
        @functools.wraps(fn)
        async def wrapper(self, *args, **kwargs):
            redis_client: aioredis.Redis = getattr(self, "redis_client", None)
            service_name = getattr(self, "service_name", fn.__qualname__)

            if redis_client:
                state = await redis_client.get(f"cb_state:{service_name}") or _STATE_CLOSED
                if isinstance(state, bytes):
                    state = state.decode()
                if state == _STATE_OPEN:
                    raise CircuitBreakerOpenError(f"Circuit breaker open for {service_name}")

            try:
                result = await fn(self, *args, **kwargs)
                if redis_client:
                    await redis_client.delete(f"cb_failures:{service_name}")
                    await redis_client.setex(f"cb_state:{service_name}", recovery_timeout, _STATE_CLOSED)
                return result
            except Exception as exc:
                if redis_client:
                    failures = await redis_client.incr(f"cb_failures:{service_name}")
                    await redis_client.expire(f"cb_failures:{service_name}", recovery_timeout)
                    if int(failures) >= failure_threshold:
                        await redis_client.setex(f"cb_state:{service_name}", recovery_timeout, _STATE_OPEN)
                raise

        return wrapper
    return decorator
