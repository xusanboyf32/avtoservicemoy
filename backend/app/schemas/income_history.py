from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.product import ProductResponseSchema
from app.schemas.kontragent import KontragentResponseSchema


class IncomeItemHistorySchema(BaseModel):
    id: int
    income_id: int
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    price_usd: Optional[float] = None
    exchange_rate: Optional[float] = None
    price_som: Optional[float] = None
    created_at: datetime
    product: Optional[ProductResponseSchema] = None

    class Config:
        from_attributes = True
