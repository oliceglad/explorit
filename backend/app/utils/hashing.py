import hashlib
import base64

from passlib.context import CryptContext

_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash(password: str) -> str:
    # bcrypt truncates at 72 bytes — pre-hash with SHA-256 to support any length
    digest = hashlib.sha256(password.encode("utf-8")).digest()
    return base64.b64encode(digest).decode("utf-8")


def hash_password(plain: str) -> str:
    return _ctx.hash(_prehash(plain))


def verify_password(plain: str, hashed: str) -> bool:
    return _ctx.verify(_prehash(plain), hashed)
