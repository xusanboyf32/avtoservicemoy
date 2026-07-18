from sqlalchemy import Column, Integer, Float, Boolean, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class PaymentTypeEnum(str, enum.Enum):
    naqd = "naqd"
    karta = "karta"
    aralash = "aralash"
    qarz = "qarz"


class IncomePayment(Base, TimestampMixin):
    __tablename__ = "income_payments"

    income_id = Column(Integer, ForeignKey("incomes.id"), unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    naqd_amount = Column(Float, default=0.0, nullable=False)
    karta_amount = Column(Float, default=0.0, nullable=False)
    debt_amount = Column(Float, nullable=False)
    is_paid = Column(Boolean, default=False)
    payment_type = Column(String, nullable=False, default="qarz")

    income = relationship("Income", back_populates="payment")

