from sqlalchemy import Column, String
from app.db.base import Base
from app.utils import TimestampMixin


class Unit(Base, TimestampMixin):
    __tablename__ = "units"

    name = Column(String, unique=True, index=True, nullable=False)


