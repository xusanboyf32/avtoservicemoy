from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
from datetime import date


class OilRecord(Base, TimestampMixin):
    __tablename__ = "oil_records"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    # Sana
    date = Column(Date, default=date.today, nullable=False)

    # Moy ma'lumotlari
    oil_brand = Column(String, nullable=True)       # Hyundai Xteer, Aveno hk
    oil_type = Column(String, nullable=True)        # 5W-30, 10W-40 hk
    mileage = Column(Integer, nullable=True)        # Probeg km
    transmission = Column(String, nullable=True)    # AKPP / MKPP

    # Keyingi sana
    next_date = Column(Date, nullable=True)

    # Filtrlar (True/False)
    oil_filter = Column(Boolean, default=False)
    salon_filter = Column(Boolean, default=False)
    spark_plug = Column(Boolean, default=False)
    air_filter = Column(Boolean, default=False)
    fuel_filter = Column(Boolean, default=False)
    pampers = Column(Boolean, default=False)

    # Usta
    master_name = Column(String, nullable=True)
    master_phone = Column(String, nullable=True)

    # Izoh
    note = Column(String, nullable=True)

    # ── Operator qo'ng'iroq boshqaruvi ──────────────
    call_status = Column(String, default="kutilmoqda")  # kutilmoqda / gaplashildi / kotarmadi / keladi / hal_qilindi
    call_note = Column(String, nullable=True)  # Operator izohi: "Juma kuni keladi dedi"
    call_operator_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Kim qo'ng'iroq qildi
    call_time = Column(String, nullable=True)  # Qachon qo'ng'iroq qilindi
    remind_date = Column(Date, nullable=True)  # "Keyinroq eslat" sanasi

    # Relationship
    client = relationship("Client", back_populates="oil_records")