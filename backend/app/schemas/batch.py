from pydantic import BaseModel
from typing import Optional
from app.models.batch import BatchStatus
from app.schemas.product import ProductResponseSchema
from app.schemas.brand import BrandResponseSchema


class BatchCreateSchema(BaseModel):
    product_id: int
    brand_id: Optional[int] = None
    quantity: int
    price_usd: float
    exchange_rate: float
    markup_percent: float


class BatchResponseSchema(BaseModel):
    id: int
    income_id: int
    product_id: int
    brand_id: Optional[int] = None
    quantity: int
    price_usd: float
    exchange_rate: float
    markup_percent: float
    price_som: float
    markup_sum: float
    sale_price_raw: float
    sale_price: float
    total_usd: float
    total_som: float
    status: BatchStatus
    is_current: bool
    is_active: bool
    product: ProductResponseSchema
    brand: Optional[BrandResponseSchema] = None

    class Config:
        from_attributes = True


class BatchStockResponseSchema(BaseModel):
    """Mahsulot umumiy holati — kassir va admin uchun"""
    product: ProductResponseSchema
    joriy_soni: int
    joriy_narx: float
    keyingi_soni: Optional[int] = None
    keyingi_narx: Optional[float] = None
    min_narx_6oy: Optional[float] = None
    max_narx_6oy: Optional[float] = None

    class Config:
        from_attributes = True

