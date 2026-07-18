from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class SafeDirection(str, enum.Enum):
    kirim = "kirim"     # pul kirdi (+ balans)
    chiqim = "chiqim"   # pul chiqdi (- balans)


class SafeTransaction(Base, TimestampMixin):
    __tablename__ = "safe_transactions"

    direction = Column(Enum(SafeDirection), nullable=False)

    amount = Column(Float, nullable=False)          # jami summa (naqd+karta)
    naqd_amount = Column(Float, default=0.0, nullable=False)
    karta_amount = Column(Float, default=0.0, nullable=False)

    note = Column(String, nullable=True)             # erkin izoh: "ehson", "svet", "kontragent to'lovi" va h.k.

    # Ixtiyoriy bog'lanishlar
    related_kontragent_id = Column(Integer, ForeignKey("kontragentlar.id"), nullable=True)
    related_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # xodim maoshi uchun

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)    # kim yozgan (buxgalter/admin/superadmin)

    # Relationshiplar
    kontragent = relationship("Kontragent", backref="safe_transactions")
    related_user = relationship("User", foreign_keys=[related_user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
