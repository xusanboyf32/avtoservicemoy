from sqlalchemy import Column, String, Integer, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.utils import TimestampMixin
import enum


class TransferStatus(str, enum.Enum):
    yuborildi = "yuborildi"
    qabul = "qabul"
    rad = "rad"


class WarehouseTransfer(Base, TimestampMixin):
    """Transfer GURUHI — bitta yuborish (ichida ko'p mahsulot), bitta kassirga"""
    __tablename__ = "warehouse_transfers"

    # Holat
    status = Column(Enum(TransferStatus), default=TransferStatus.yuborildi, nullable=False)

    # Kim yubordi (omborchi)
    sent_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Kim qabul qildi (kassir)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Qaysi kassirga yuborildi (belgilangan kassir)
    kassir_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Izoh
    note = Column(String, nullable=True)

    # Relationshiplar
    sender = relationship("User", foreign_keys=[sent_by], backref="sent_transfers")
    confirmer = relationship("User", foreign_keys=[confirmed_by], backref="confirmed_transfers")
    kassir = relationship("User", foreign_keys=[kassir_id], backref="assigned_transfers")
    items = relationship("TransferItem", back_populates="transfer")


class TransferItem(Base, TimestampMixin):
    """Transfer ichidagi bitta mahsulot"""
    __tablename__ = "transfer_items"

    transfer_id = Column(Integer, ForeignKey("warehouse_transfers.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)

    # Yuborilgan soni
    sent_quantity = Column(Integer, nullable=False)

    # Qabul qilingan soni (odatda sent_quantity ga teng)
    confirmed_quantity = Column(Integer, nullable=True)

    # Relationshiplar
    transfer = relationship("WarehouseTransfer", back_populates="items")
    batch = relationship("Batch", backref="transfer_items")
