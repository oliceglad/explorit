import uuid
import mimetypes
from typing import Literal

import aioboto3
from botocore.exceptions import ClientError

from app.config import settings

_ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif"}
_MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

UploadFolder = Literal["avatars", "posts", "routes"]

_session = aioboto3.Session(
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
)


def _public_url(key: str) -> str:
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/{key}"


async def upload_file(data: bytes, content_type: str, folder: UploadFolder) -> str:
    if content_type not in _ALLOWED_MIME:
        raise ValueError(f"Unsupported file type: {content_type}")
    if len(data) > _MAX_SIZE_BYTES:
        raise ValueError("File exceeds 10 MB limit")

    ext = mimetypes.guess_extension(content_type) or ".jpg"
    if ext == ".jpe":
        ext = ".jpg"
    key = f"{folder}/{uuid.uuid4().hex}{ext}"

    async with _session.client("s3", endpoint_url=settings.s3_endpoint_url) as s3:
        await s3.put_object(
            Bucket=settings.s3_bucket_name,
            Key=key,
            Body=data,
            ContentType=content_type,
            ACL="public-read",
        )

    return _public_url(key)


async def delete_file(url: str) -> None:
    prefix = f"{settings.s3_endpoint_url}/{settings.s3_bucket_name}/"
    if not url.startswith(prefix):
        return
    key = url[len(prefix):]
    async with _session.client("s3", endpoint_url=settings.s3_endpoint_url) as s3:
        try:
            await s3.delete_object(Bucket=settings.s3_bucket_name, Key=key)
        except ClientError:
            pass


async def ensure_bucket_exists() -> None:
    async with _session.client("s3", endpoint_url=settings.s3_endpoint_url) as s3:
        try:
            await s3.head_bucket(Bucket=settings.s3_bucket_name)
        except ClientError:
            await s3.create_bucket(Bucket=settings.s3_bucket_name)
            await s3.put_bucket_acl(Bucket=settings.s3_bucket_name, ACL="public-read")
