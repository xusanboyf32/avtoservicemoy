from sqlalchemy import Column, String
from app.db.base import Base
from app.utils import TimestampMixin


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    name = Column(String, unique=True, index=True, nullable=False)

