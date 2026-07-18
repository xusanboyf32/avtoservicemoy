from sqlalchemy import Column, String, Enum, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum



class RoleEnum(str, enum.Enum):
    superadmin = "superadmin"
    admin = "admin"
    kassir = "kassir"
    skladchi = "skladchi"
    operator = "operator"
    kontragent = "kontragent"
    buxgalter = "buxgalter"



class User(Base, TimestampMixin):
    __tablename__ = "users"

    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)

    profile = relationship("Profile", back_populates="user", uselist=False)
    permission = relationship("Permission", back_populates="user", uselist=False)


class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    position = Column(String, nullable=True)

    user = relationship("User", back_populates="profile")


class Permission(Base, TimestampMixin):
    __tablename__ = "permissions"

    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    # SOTUV
    sotish = Column(Boolean, default=False)
    narx_ozgartirish = Column(Boolean, default=False)
    mahsulot_chegirma = Column(Boolean, default=False)
    umumiy_chegirma = Column(Boolean, default=False)
    qaytarish = Column(Boolean, default=False)

    # SAVATCHA
    savatdan_ochirish = Column(Boolean, default=False)
    savatchani_tozalash = Column(Boolean, default=False)

    # MAHSULOTLAR
    mahsulot_royxati = Column(Boolean, default=False)
    mahsulot_qidirish = Column(Boolean, default=False)
    narx_yorligi = Column(Boolean, default=False)

    # MIJOZLAR
    mijoz_royxati = Column(Boolean, default=False)
    mijoz_tarixi = Column(Boolean, default=False)
    mijoz_tahrirlash = Column(Boolean, default=False)
    mijoz_ochirish = Column(Boolean, default=False)

    # CHECKLAR
    check_royxati = Column(Boolean, default=False)
    check_korish = Column(Boolean, default=False)

    # OMBOR
    ombor_royxati = Column(Boolean, default=False)
    ombor_qidirish = Column(Boolean, default=False)
    mahsulot_kiritish = Column(Boolean, default=False)
    kassaga_yuborish = Column(Boolean, default=False)
    ombor_tasdiqlash = Column(Boolean, default=False)

    # MIJOZ ESLATMA
    eslatma_qoshish = Column(Boolean, default=False)
    yaqin_sanalar = Column(Boolean, default=False)

    # HISOBOT
    hisobot_korish = Column(Boolean, default=False)

    # BOSHQARUV
    xodim_boshqarish = Column(Boolean, default=False)

    user = relationship("User", back_populates="permission")

