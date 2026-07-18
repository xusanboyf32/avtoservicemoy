from sqlalchemy import Column, String
from app.db.base import Base
from app.utils import TimestampMixin


class Brand(Base, TimestampMixin):
    __tablename__ = "brands"

    name = Column(String, unique=True, index=True, nullable=False)
