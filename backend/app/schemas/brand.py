from pydantic import BaseModel
from typing import Optional


class BrandCreateSchema(BaseModel):
    name: str


class BrandUpdateSchema(BaseModel):
    name: Optional[str] = None


class BrandResponseSchema(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True
