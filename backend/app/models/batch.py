from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class BatchStatus(str, enum.Enum):
    aktiv = "aktiv"          # is_current=True, kassirda sotilmoqda
    kutmoqda = "kutmoqda"    # is_current=False, navbat kutmoqda
    tugagan = "tugagan"      # quantity=0, is_active=False


class Batch(Base, TimestampMixin):
    __tablename__ = "batches"

    # Qaysi kirimga tegishli
    income_id = Column(Integer, ForeignKey("incomes.id"), nullable=False)

    # Qaysi mahsulot
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    # Brend
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=True)

    # Miqdor
    quantity = Column(Integer, default=0, nullable=False)

    # Kirim narxi
    price_usd = Column(Float, nullable=False)
    exchange_rate = Column(Float, nullable=False)
    markup_percent = Column(Float, nullable=False)

    # Hisoblangan narxlar (avtomatik)
    price_som = Column(Float, nullable=False)
    markup_sum = Column(Float, nullable=False)
    sale_price_raw = Column(Float, nullable=False)
    sale_price = Column(Float, nullable=False)

    # Jami
    total_usd = Column(Float, nullable=False)
    total_som = Column(Float, nullable=False)

    # Holat
    status = Column(
        Enum(BatchStatus),
        default=BatchStatus.aktiv,
        nullable=False
    )
    is_current = Column(Boolean, default=False, nullable=False)

    # Relationshiplar
    income = relationship("Income", backref="batches")
    product = relationship("Product", back_populates="batches")
    brand = relationship("Brand", backref="batches")

