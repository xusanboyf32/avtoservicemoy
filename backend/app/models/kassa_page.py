from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin


class KassaPage(Base, TimestampMixin):
    __tablename__ = "kassa_pages"

    # Page raqami (1-17)
    page_number = Column(Integer, unique=True, nullable=False)

    # Holat
    status = Column(String, default="bosh", nullable=False)  # bosh / band

    # Qaysi mijoz (ixtiyoriy)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    # Savatcha (JSON)
    items = Column(JSON, default=[], nullable=False)

    # Relationshiplar
    client = relationship("Client", backref="kassa_pages")

