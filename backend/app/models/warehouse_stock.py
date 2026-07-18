from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class WarehouseStock(Base, TimestampMixin):
    __tablename__ = "warehouse_stocks"

    batch_id = Column(Integer, ForeignKey("batches.id"), unique=True, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)

    # Relationship
    batch = relationship("Batch", backref="warehouse_stock")

