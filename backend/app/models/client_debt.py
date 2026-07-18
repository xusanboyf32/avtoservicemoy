from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class DebtPaymentType(str, enum.Enum):
    naqd = "naqd"
    karta = "karta"
    aralash = "aralash"


class ClientDebt(Base, TimestampMixin):
    __tablename__ = "client_debts"

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)

    # Summalar
    total_amount = Column(Float, nullable=False)       # Jami qarz (o'zgarmaydi)
    paid_amount = Column(Float, default=0.0)           # To'langan
    debt_amount = Column(Float, nullable=False)        # Qolgan qarz

    # To'liq to'landimi
    is_paid = Column(Boolean, default=False)

    # Izoh
    note = Column(String, nullable=True)

    # Relationshiplar
    client = relationship("Client", back_populates="debts")
    sale = relationship("Sale", back_populates="debt")
    payments = relationship("ClientDebtPayment", back_populates="debt")


class ClientDebtPayment(Base, TimestampMixin):
    __tablename__ = "client_debt_payments"

    debt_id = Column(Integer, ForeignKey("client_debts.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)

    # To'langan summa
    amount = Column(Float, nullable=False)

    # To'lov turi
    payment_type = Column(Enum(DebtPaymentType), nullable=False)

    # Izoh
    note = Column(String, nullable=True)

    # Relationshiplar
    debt = relationship("ClientDebt", back_populates="payments")
    client = relationship("Client", backref="debt_payments")

