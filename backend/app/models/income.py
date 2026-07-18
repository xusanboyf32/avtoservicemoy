from sqlalchemy import Column, String, Integer, ForeignKey, Date, Float
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
from datetime import date
from app.models.payment import IncomePayment  # fayl nomi qanday bo'lsa


class Income(Base, TimestampMixin):
    __tablename__ = "incomes"

    # Kirim raqami (KR-0001, KR-0002...)
    income_number = Column(String, unique=True, index=True, nullable=False)

    # Sana
    date = Column(Date, default=date.today, nullable=False)

    # Omborchi
    warehouse_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Kontragent
    kontragent_id = Column(Integer, ForeignKey("kontragentlar.id"), nullable=False)

    note = Column(String, nullable=True)

    # Relationshiplar
    warehouse_user = relationship("User", backref="incomes")
    kontragent = relationship("Kontragent", backref="incomes")
    items = relationship("IncomeItem", back_populates="income")

    # income.py da Income classiga qo'shing
    payment = relationship("IncomePayment", back_populates="income", uselist=False)


class IncomeItem(Base, TimestampMixin):
    __tablename__ = "income_items"

    income_id  = Column(Integer, ForeignKey("incomes.id"), nullable=False, index=True)
    batch_id   = Column(Integer, ForeignKey("batches.id"), nullable=True)   # ← nullable
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    brand_id   = Column(Integer, ForeignKey("brands.id"), nullable=True)
    quantity   = Column(Integer, nullable=True)

    # Asl kelgan narx — abadiy saqlanadi, Batch keyinchalik birlashib ketsa ham o'zgarmaydi
    price_usd = Column(Float, nullable=True)
    exchange_rate = Column(Float, nullable=True)
    price_som = Column(Float, nullable=True)   # = price_usd * exchange_rate, tan narx

    # Relationshiplar — ochiq!
    income = relationship("Income", back_populates="items")
    batch  = relationship("Batch", backref="income_items")


