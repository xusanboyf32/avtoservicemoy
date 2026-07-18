from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class KassaStock(Base, TimestampMixin):
    __tablename__ = "kassa_stocks"

    batch_id = Column(Integer, ForeignKey("batches.id"), unique=True, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)

    # Relationship
    batch = relationship("Batch", backref="kassa_stock")

