from pydantic import BaseModel
from typing import Optional
from app.models.users import RoleEnum


class PermissionSchema(BaseModel):
    # SOTUV
    sotish: bool = False
    narx_ozgartirish: bool = False
    mahsulot_chegirma: bool = False
    umumiy_chegirma: bool = False
    qaytarish: bool = False

    # SAVATCHA
    savatdan_ochirish: bool = False
    savatchani_tozalash: bool = False

    # MAHSULOTLAR
    mahsulot_royxati: bool = False
    mahsulot_qidirish: bool = False
    narx_yorligi: bool = False

    # MIJOZLAR
    mijoz_royxati: bool = False
    mijoz_tarixi: bool = False
    mijoz_tahrirlash: bool = False
    mijoz_ochirish: bool = False

    # CHECKLAR
    check_royxati: bool = False
    check_korish: bool = False

    # OMBOR
    ombor_royxati: bool = False
    ombor_qidirish: bool = False
    mahsulot_kiritish: bool = False
    kassaga_yuborish: bool = False
    ombor_tasdiqlash: bool = False

    # MIJOZ ESLATMA
    eslatma_qoshish: bool = False
    yaqin_sanalar: bool = False

    # HISOBOT
    hisobot_korish: bool = False

    # BOSHQARUV
    xodim_boshqarish: bool = False

    class Config:
        from_attributes = True


class ProfileSchema(BaseModel):
    full_name: str
    phone: Optional[str] = None
    position: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreateSchema(BaseModel):
    """Yangi user yaratish uchun"""
    username: str
    password: str
    role: RoleEnum
    full_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None


class UserUpdateSchema(BaseModel):
    """User ma'lumotlarini yangilash uchun"""
    username: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None


class UserResponseSchema(BaseModel):
    """Frontendga qaytariladigan user ma'lumoti"""
    id: int
    username: str
    role: RoleEnum
    is_active: bool
    profile: Optional[ProfileSchema] = None
    permission: Optional[PermissionSchema] = None

    class Config:
        from_attributes = True


