from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class KontragentReturn(Base, TimestampMixin):
    """Kontragentga mahsulot qaytarish — bitta guruh (bir yoki bir nechta partiyadan)"""
    __tablename__ = "kontragent_returns"

    kontragent_id = Column(Integer, ForeignKey("kontragentlar.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    quantity = Column(Integer, nullable=False)        # jami qaytarilgan miqdor
    total_amount = Column(Float, nullable=False)       # jami summa (tan narx bo'yicha, LIFO taqsimlangan)

    paid_amount = Column(Float, default=0.0, nullable=False)   # kontragent qancha to'lagan
    debt_amount = Column(Float, nullable=False)         # qolgan qarz (kontragent bizga)
    is_paid = Column(Boolean, default=False, nullable=False)

    note = Column(String, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    kontragent = relationship("Kontragent", backref="returns")
    product = relationship("Product")
    created_by = relationship("User")

    items = relationship("KontragentReturnItem", back_populates="kontragent_return")


class KontragentReturnItem(Base, TimestampMixin):
    """Qaysi partiyadan qancha va qanday narxda qaytarilgani (LIFO natijasi)"""
    __tablename__ = "kontragent_return_items"

    kontragent_return_id = Column(Integer, ForeignKey("kontragent_returns.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    quantity = Column(Integer, nullable=False)     # shu partiyadan qancha qaytdi
    unit_price = Column(Float, nullable=False)      # shu partiyaning tan narxi (price_som)
    amount = Column(Float, nullable=False)           # quantity * unit_price

    kontragent_return = relationship("KontragentReturn", back_populates="items")
    batch = relationship("Batch")

