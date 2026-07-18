from pydantic import BaseModel
from typing import Optional
from app.models.payment import PaymentTypeEnum


class IncomePaymentCreateSchema(BaseModel):
    payment_type: PaymentTypeEnum
    naqd_amount: float = 0.0
    karta_amount: float = 0.0


class IncomePaymentUpdateSchema(BaseModel):
    payment_type: PaymentTypeEnum
    naqd_amount: Optional[float] = 0.0
    karta_amount: Optional[float] = 0.0


class IncomePaymentResponseSchema(BaseModel):
    id: int
    income_id: int
    total_amount: float
    naqd_amount: float
    karta_amount: float
    debt_amount: float
    is_paid: bool
    payment_type: str

    class Config:
        from_attributes = True
