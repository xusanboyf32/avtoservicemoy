from pydantic import BaseModel
from typing import Optional, List
from app.schemas.client import ClientResponseSchema


class KassaPageItemSchema(BaseModel):
    batch_id: int
    product_name: str
    quantity: int
    original_price: float
    sale_price: float
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    total: float


class KassaPageUpdateSchema(BaseModel):
    client_id: Optional[int] = None
    items: Optional[List[KassaPageItemSchema]] = None
    status: Optional[str] = None


class KassaPageResponseSchema(BaseModel):
    id: int
    page_number: int
    status: str
    client_id: Optional[int] = None
    items: List
    client: Optional[ClientResponseSchema] = None

    class Config:
        from_attributes = True


