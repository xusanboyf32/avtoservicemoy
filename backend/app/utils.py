from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.ext.declarative import declared_attr
from datetime import datetime


class TimestampMixin:
    """
    Barcha modellarga qo'shiladigan umumiy ustunlar
    """

    id = Column(Integer, primary_key=True, index=True)

    created_at = Column(
        DateTime,
        index=True,
        default=datetime.now,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.now,
        onupdate=datetime.now,  # yangilanganda avtomatik o'zgaradi
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True  # o'chirish o'rniga False qilinadi
    )
