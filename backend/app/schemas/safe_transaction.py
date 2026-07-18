from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.safe_transaction import SafeDirection


class SafeTransactionCreateSchema(BaseModel):
    direction: SafeDirection
    naqd_amount: float = 0.0
    karta_amount: float = 0.0
    note: Optional[str] = None
    related_kontragent_id: Optional[int] = None
    related_user_id: Optional[int] = None


class SafeTransactionResponseSchema(BaseModel):
    id: int
    direction: SafeDirection
    amount: float
    naqd_amount: float
    karta_amount: float
    note: Optional[str] = None
    related_kontragent_id: Optional[int] = None
    related_user_id: Optional[int] = None
    created_by_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class SafeBalanceSchema(BaseModel):
    naqd_balans: float
    karta_balans: float
    jami_balans: float
