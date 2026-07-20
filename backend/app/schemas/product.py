from pydantic import BaseModel
from typing import Optional
from app.schemas.category import CategoryResponseSchema
from app.schemas.unit import UnitResponseSchema


class ProductCreateSchema(BaseModel):
    name: str
    category_id: int
    unit_id: int
    barcode: Optional[str] = None
    description: Optional[str] = None


class ProductUpdateSchema(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    barcode: Optional[str] = None
    description: Optional[str] = None


class ProductResponseSchema(BaseModel):
    id: int
    name: str
    barcode: Optional[str] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    category: CategoryResponseSchema
    unit: UnitResponseSchema

    class Config:
        from_attributes = True
