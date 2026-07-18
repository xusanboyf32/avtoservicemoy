from pydantic import BaseModel
from typing import Optional, List
from app.models.sale import PaymentType
from app.schemas.client import ClientResponseSchema
from app.schemas.users import UserResponseSchema
from datetime import datetime


class SaleItemCreateSchema(BaseModel):
    batch_id: int
    quantity: int
    original_price: float
    sale_price: float
    discount_percent: float = 0.0
    discount_amount: float = 0.0


class SaleCreateSchema(BaseModel):
    page_number: int
    client_id: Optional[int] = None
    items: List[SaleItemCreateSchema]
    discount_percent: float = 0.0
    # total_amount: float
    discount_amount: float = 0.0
    # final_amount: float
    paid_amount: float = 0.0
    # debt_amount: float = 0.0
    payment_type: PaymentType
    naqd_amount: float = 0
    karta_amount: float = 0

    note: Optional[str] = None




# Mahsulot nomi chekda ko'rinishi uchun
class ProductShortSchema(BaseModel):
    id: int
    name: str
    barcode: str

    class Config:
        from_attributes = True


class BatchShortSchema(BaseModel):
    id: int
    sale_price: float
    product: ProductShortSchema

    class Config:
        from_attributes = True


class SaleItemResponseSchema(BaseModel):
    id: int
    batch_id: int
    quantity: int
    original_price: float
    sale_price: float
    discount_percent: float
    discount_amount: float
    total: float
    is_active: bool
    batch: Optional[BatchShortSchema] = None  # ← mahsulot nomi shu yerdan

    class Config:
        from_attributes = True


class SaleResponseSchema(BaseModel):
    id: int
    page_number: int
    total_amount: float
    discount_amount: float
    final_amount: float
    paid_amount: float
    debt_amount: float
    payment_type: PaymentType
    note: Optional[str] = None
    is_active: bool

    naqd_amount: float
    karta_amount: float

    manba: str = "kassa"

    created_at: datetime

    created_at: datetime          # ← sana/vaqt (chek tarixida kerak)
    kassir: UserResponseSchema
    client: Optional[ClientResponseSchema] = None
    items: List[SaleItemResponseSchema]

    class Config:
        from_attributes = True





class SaleReturnResponseSchema(BaseModel):
    id: int
    sale_id: int
    sale_item_id: int
    batch_id: int
    client_id: Optional[int] = None
    kassir_id: int

    quantity: int
    amount: float
    return_type: str
    naqd_amount: float
    karta_amount: float
    manba: str
    note: Optional[str] = None

    created_at: datetime

    kassir: Optional[UserResponseSchema] = None
    client: Optional[ClientResponseSchema] = None
    batch: Optional[BatchShortSchema] = None

    class Config:
        from_attributes = True







# class SaleItemResponseSchema(BaseModel):
#     id: int
#     batch_id: int
#     quantity: int
#     original_price: float
#     sale_price: float
#     discount_percent: float
#     discount_amount: float
#     total: float
#     is_active: bool
#
#     class Config:
#         from_attributes = True

#
# class SaleResponseSchema(BaseModel):
#     id: int
#     page_number: int
#     total_amount: float
#     discount_amount: float
#     final_amount: float
#     paid_amount: float
#     debt_amount: float
#     payment_type: PaymentType
#     note: Optional[str] = None
#     is_active: bool
#     kassir: UserResponseSchema
#     client: Optional[ClientResponseSchema] = None
#     items: List[SaleItemResponseSchema]
#
#     class Config:
#         from_attributes = True


