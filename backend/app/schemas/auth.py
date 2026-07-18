from pydantic import BaseModel
from app.models.users import RoleEnum


class LoginRequest(BaseModel):
    """Kirish uchun so'rov"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Login bo'lgandan keyin token qaytariladi"""
    access_token: str
    token_type: str = "bearer"
    role: RoleEnum
    username: str


class TokenData(BaseModel):
    """Token ichidagi ma'lumot"""
    username: str
    role: RoleEnum


