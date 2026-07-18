from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.warehouse_transfer import TransferStatus
from app.schemas.batch import BatchResponseSchema
from app.schemas.users import UserResponseSchema


# ── CREATE (savat: guruh + itemlar) ──
class TransferItemCreateSchema(BaseModel):
    batch_id: int
    sent_quantity: int


class WarehouseTransferCreateSchema(BaseModel):
    kassir_id: Optional[int] = None
    note: Optional[str] = None
    items: List[TransferItemCreateSchema]


class WarehouseTransferConfirmSchema(BaseModel):
    note: Optional[str] = None


# ── RESPONSE (guruh + ichidagi itemlar) ──
class TransferItemResponseSchema(BaseModel):
    id: int
    batch_id: int
    sent_quantity: int
    confirmed_quantity: Optional[int] = None
    batch: Optional[BatchResponseSchema] = None

    class Config:
        from_attributes = True


class WarehouseTransferResponseSchema(BaseModel):
    id: int
    status: TransferStatus
    note: Optional[str] = None
    is_active: bool
    created_at: datetime

    sender: Optional[UserResponseSchema] = None
    confirmer: Optional[UserResponseSchema] = None
    kassir: Optional[UserResponseSchema] = None
    items: List[TransferItemResponseSchema] = []

    class Config:
        from_attributes = True