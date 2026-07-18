from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class KontragentReturnCreateSchema(BaseModel):
    kontragent_id: int
    product_id: int
    quantity: int
    override_total_amount: Optional[float] = None   # agar admin narxni qo'lda kiritmoqchi bo'lsa
    note: Optional[str] = None


class KontragentReturnItemResponseSchema(BaseModel):
    id: int
    batch_id: int
    quantity: int
    unit_price: float
    amount: float

    class Config:
        from_attributes = True


class KontragentReturnResponseSchema(BaseModel):
    id: int
    kontragent_id: int
    product_id: int
    quantity: int
    total_amount: float
    paid_amount: float
    debt_amount: float
    is_paid: bool
    note: Optional[str] = None
    created_at: datetime
    items: List[KontragentReturnItemResponseSchema] = []

    class Config:
        from_attributes = True


class KontragentReturnPaySchema(BaseModel):
    """Kontragent bizga qarzini to'laydi — eng eski qaytarishdan boshlab taqsimlanadi (FIFO)"""
    amount: float
    naqd_amount: float = 0.0
    karta_amount: float = 0.0
    payment_type: str = "naqd"   # naqd / karta / aralash
    note: Optional[str] = None
