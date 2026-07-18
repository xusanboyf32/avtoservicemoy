from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.users import UserResponseSchema
from app.services.auth import login_user
from app.core.dependencies import get_current_user
from app.models.users import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login qilish
    → username va password keladi
    → token va role qaytariladi
    """
    return login_user(db, request.username, request.password)


@router.get("/me", response_model=UserResponseSchema)
def me(current_user: User = Depends(get_current_user)):
    """
    Hozirgi foydalanuvchi ma'lumotlari
    → Token yuboriladi
    → User ma'lumoti qaytariladi
    """
    return current_user


@router.post("/logout")
def logout():
    """
    Logout qilish
    → Frontend tokenni o'chiradi
    → Backend hech narsa qilmaydi
    """
    return {"message": "Muvaffaqiyatli chiqildi!"}
