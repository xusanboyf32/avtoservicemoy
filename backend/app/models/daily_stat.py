from sqlalchemy import Column, Integer, Float, Date
from app.db.base import Base
from app.utils import TimestampMixin
from datetime import date


class DailyStat(Base, TimestampMixin):
    __tablename__ = "daily_stats"

    # Sana
    date = Column(Date, default=date.today, unique=True, nullable=False, index=True)

    # Savdo
    total_sales = Column(Float, default=0.0)       # Jami savdo summasi
    cash_amount = Column(Float, default=0.0)        # Kassada (naqd + karta)

    card_amount = Column(Float, default=0.0)        # ⬅️ YANGI — Karta savdo
    mixed_amount = Column(Float, default=0.0)       # ⬅️ YANGI — Aralash savdo


    debt_amount = Column(Float, default=0.0)        # Qarzga ketgan
    return_amount = Column(Float, default=0.0)      # Qaytarilgan

    # Oylik (har oy boshi 0 dan boshlanadi)
    monthly_sales = Column(Float, default=0.0)      # Oylik jami savdo
    monthly_cash = Column(Float, default=0.0)       # Oylik kassada
    monthly_debt = Column(Float, default=0.0)       # Oylik qarzga ketgan


