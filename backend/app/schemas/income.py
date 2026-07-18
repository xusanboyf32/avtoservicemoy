from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from app.schemas.batch import BatchResponseSchema
from app.schemas.kontragent import KontragentResponseSchema
from app.schemas.users import UserResponseSchema
from app.schemas.payment import IncomePaymentResponseSchema
from app.schemas.payment import PaymentTypeEnum


class IncomeItemCreateSchema(BaseModel):
    product_id: int
    brand_id: Optional[int] = None
    quantity: int
    # Narx — omborchi kirita OLMAYDI (Optional, default None)
    # Faqat admin PATCH /incomes/{id}/set-prices orqali kiritadi
    price_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    markup_percent: Optional[float] = None


class IncomeCreateSchema(BaseModel):
    kontragent_id: int
    items: List[IncomeItemCreateSchema]
    payment_type: PaymentTypeEnum = PaymentTypeEnum.qarz
    naqd_amount: float = 0.0
    karta_amount: float = 0.0
    note: Optional[str] = None


class IncomeItemResponseSchema(BaseModel):
    id: int
    product_id: Optional[int] = None
    brand_id: Optional[int] = None
    quantity: Optional[int] = None
    batch: Optional[BatchResponseSchema] = None  # ← nullable (narx yo'q bo'lsa None)

    class Config:
        from_attributes = True


class IncomeResponseSchema(BaseModel):
    id: int
    income_number: str
    date: date
    is_active: bool
    warehouse_user: UserResponseSchema
    kontragent: KontragentResponseSchema
    items: List[IncomeItemResponseSchema]
    payment: Optional[IncomePaymentResponseSchema] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True

