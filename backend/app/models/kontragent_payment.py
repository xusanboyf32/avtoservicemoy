from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class KontragentPayment(Base, TimestampMixin):
    __tablename__ = "kontragent_payments"

    kontragent_id = Column(Integer, ForeignKey("kontragentlar.id"), nullable=False)
    total_amount = Column(Float, nullable=False)        # jami to'langan (naqd + karta)
    naqd_amount = Column(Float, default=0.0, nullable=False)
    karta_amount = Column(Float, default=0.0, nullable=False)
    payment_type = Column(String, nullable=False, default="naqd")  # naqd/karta/aralash
    note = Column(String, nullable=True)

    kontragent = relationship("Kontragent", backref="payments")


