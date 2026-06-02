from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.user import User
from app.services.storage_service import upload_file, UploadFolder

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


class UploadResponse(BaseModel):
    url: str


@router.post("/avatar", response_model=UploadResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Загрузить аватар пользователя. Возвращает публичный URL."""
    return await _upload(file, "avatars")


@router.post("/post-image", response_model=UploadResponse)
async def upload_post_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Загрузить изображение для поста. Возвращает публичный URL."""
    return await _upload(file, "posts")


@router.post("/route-image", response_model=UploadResponse)
async def upload_route_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Загрузить обложку маршрута. Возвращает публичный URL."""
    return await _upload(file, "routes")


async def _upload(file: UploadFile, folder: UploadFolder) -> UploadResponse:
    content_type = file.content_type or ""
    data = await file.read()
    try:
        url = await upload_file(data, content_type, folder)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return UploadResponse(url=url)
