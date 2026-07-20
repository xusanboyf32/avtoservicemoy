from sqlalchemy import Column, String, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    name = Column(String, index=True, nullable=False)
    barcode = Column(String, unique=True, index=True, nullable=True)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)   # mijoz sahifasi uchun rasm yo'li


    # Bog'liqliklar
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)

    # Relationshiplar
    category = relationship("Category", backref="products")
    unit = relationship("Unit", backref="products")
    batches = relationship("Batch", back_populates="product")

