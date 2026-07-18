from sqlalchemy import Column, String, Integer, ForeignKey, Float
from app.db.base import Base
from app.utils import TimestampMixin
from sqlalchemy.orm import relationship

class Kontragent(Base, TimestampMixin):
    __tablename__ = "kontragentlar"

    name = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    jami_qarz = Column(Float, default=0.0, nullable=False)      # biz kontragentga qarzmiz
    menga_qarzi = Column(Float, default=0.0, nullable=False)    # ⬅️ YANGI — kontragent bizga qarzdor (qaytargan tovar uchun)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user = relationship("User", backref="kontragent")
