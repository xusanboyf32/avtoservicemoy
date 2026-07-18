from sqlalchemy import Column, String, Float
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    full_name = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True, index=True)
    car_number = Column(String, nullable=True, index=True)
    car_model = Column(String, nullable=True)

    # Jami qarz (avtomatik hisob)
    jami_qarz = Column(Float, default=0.0, nullable=False)

    # Relationshiplar
    oil_records = relationship("OilRecord", back_populates="client")
    debts = relationship("ClientDebt", back_populates="client")
    sales = relationship("Sale", back_populates="client")

