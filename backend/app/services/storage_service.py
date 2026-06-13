import logging
import mimetypes
import os
import uuid
from typing import Literal

logger = logging.getLogger(__name__)

MEDIA_DIR = "/app/media"
_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

UploadFolder = Literal["avatars", "posts", "routes"]


async def upload_file(data: bytes, content_type: str, folder: UploadFolder) -> str:
    if content_type not in _ALLOWED_MIME:
        raise ValueError(f"Unsupported file type: {content_type}")
    if len(data) > _MAX_SIZE_BYTES:
        raise ValueError("File exceeds 10 MB limit")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    if ext == ".jpe":
        ext = ".jpg"

    key = f"{folder}/{uuid.uuid4().hex}{ext}"
    path = os.path.join(MEDIA_DIR, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)

    with open(path, "wb") as f:
        f.write(data)

    logger.info("Saved file: %s (%d bytes)", key, len(data))
    return key


async def delete_file(key: str) -> None:
    path = os.path.join(MEDIA_DIR, key)
    try:
        os.remove(path)
    except OSError:
        pass


async def ensure_bucket_exists() -> None:
    os.makedirs(MEDIA_DIR, exist_ok=True)
    for folder in ("avatars", "posts", "routes"):
        os.makedirs(os.path.join(MEDIA_DIR, folder), exist_ok=True)
    logger.info("Media directories ready at %s", MEDIA_DIR)
