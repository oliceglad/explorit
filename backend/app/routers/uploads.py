import mimetypes
import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.storage_service import upload_file, UploadFolder, MEDIA_DIR

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


class UploadResponse(BaseModel):
    url: str


@router.post("/avatar", response_model=UploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return await _upload(file, "avatars")


@router.post("/post-image", response_model=UploadResponse)
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return await _upload(file, "posts")


@router.post("/route-image", response_model=UploadResponse)
async def upload_route_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    return await _upload(file, "routes")


@router.get("/proxy/{path:path}")
async def proxy_file(path: str):
    file_path = os.path.join(MEDIA_DIR, path)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    with open(file_path, "rb") as f:
        content = f.read()

    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


async def _upload(file: UploadFile, folder: UploadFolder) -> UploadResponse:
    content_type = file.content_type or ""
    data = await file.read()
    try:
        key = await upload_file(data, content_type, folder)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return UploadResponse(url=key)
