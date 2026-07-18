from sqlalchemy import Column, Integer, Float, Date
from app.db.base import Base
from app.utils import TimestampMixin
from datetime import date


class CashRegister(Base, TimestampMixin):
    """
    Yig'ilmagan (hali Sefga o'tkazilmagan) kassa puli — yagona (singleton) yozuv.
    Kunlik — har kuni 00:00 da 0ga tushadi (agar yig'ilmagan bo'lsa ham).
    Oylik — faqat "Yig'ish" bosilganda 0ga tushadi, kunlar osha to'planib boradi.
    """
    __tablename__ = "cash_register"

    kunlik_naqd = Column(Float, default=0.0, nullable=False)
    kunlik_karta = Column(Float, default=0.0, nullable=False)

    oylik_naqd = Column(Float, default=0.0, nullable=False)
    oylik_karta = Column(Float, default=0.0, nullable=False)

    last_date = Column(Date, default=date.today, nullable=False)   # kunlik uchun — oxirgi yangilangan sana

