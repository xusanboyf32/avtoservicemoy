from sqlalchemy import Column, String, Integer, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class PaymentType(str, enum.Enum):
    naqd = "naqd"
    karta = "karta"
    aralash = "aralash"
    qarz = "qarz"


class Sale(Base, TimestampMixin):
    __tablename__ = "sales"

    # Qaysi page dan chiqdi
    page_number = Column(Integer, nullable=False)

    # Kassir
    kassir_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Mijoz (ixtiyoriy)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    # Summalar
    total_amount = Column(Float, nullable=False)       # Jami (chegirmadan oldin)
    discount_amount = Column(Float, default=0.0)       # Chegirma summa
    final_amount = Column(Float, nullable=False)       # Jami (chegirmadan keyin)
    paid_amount = Column(Float, default=0.0)           # To'langan
    naqd_amount = Column(Float, default=0)  # ⬅️ YANGI
    karta_amount = Column(Float, default=0)

    debt_amount = Column(Float, default=0.0)           # Qarz

    # To'lov turi
    payment_type = Column(Enum(PaymentType), nullable=False)

    # Izoh
    note = Column(String, nullable=True)

    # Manba: "kassa" yoki "ombor"
    manba = Column(String, default="kassa", nullable=False)

    # Sync: kassadan kelgan savdoning unikal belgisi (dublikatga qarshi)
    sync_uuid = Column(String, unique=True, nullable=True, index=True)

    # Relationshiplar
    kassir = relationship("User", backref="sales")

    client = relationship("Client", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale")
    debt = relationship("ClientDebt", back_populates="sale", uselist=False)


class SaleItem(Base, TimestampMixin):
    __tablename__ = "sale_items"

    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    # Sotilgan soni
    quantity = Column(Integer, nullable=False)

    # Narxlar
    original_price = Column(Float, nullable=False)     # Asl narx (batch.sale_price)
    sale_price = Column(Float, nullable=False)         # Sotilgan narx (o'zgartirilgan bo'lsa)
    discount_percent = Column(Float, default=0.0)      # Chegirma %
    discount_amount = Column(Float, default=0.0)       # Chegirma summa
    total = Column(Float, nullable=False)              # Jami (quantity × sale_price)

    # Relationshiplar
    sale = relationship("Sale", back_populates="items")
    batch = relationship("Batch", backref="sale_items")

