from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class SaleReturn(Base, TimestampMixin):
    __tablename__ = "sale_returns"

    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    sale_item_id = Column(Integer, ForeignKey("sale_items.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)   # kimdan (chakana bo'lsa null)
    kassir_id = Column(Integer, ForeignKey("users.id"), nullable=False)    # kim qaytardi

    quantity = Column(Integer, nullable=False)     # nechta qaytdi (stockga shuncha + bo'ldi)
    amount = Column(Float, nullable=False)         # qancha pul qaytdi (yaxlit/tahrirlangan)

    return_type = Column(String, default="naqd", nullable=False)  # naqd / karta / aralash / qarz
    naqd_amount = Column(Float, default=0)         # qaytishda naqd qismi
    karta_amount = Column(Float, default=0)        # qaytishda karta qismi

    manba = Column(String, default="kassa", nullable=False)  # kassa / ombor

    note = Column(String, nullable=True)

    # Relationshiplar
    sale = relationship("Sale", backref="returns")
    batch = relationship("Batch")
    client = relationship("Client")
    kassir = relationship("User")


