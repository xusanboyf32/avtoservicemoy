from pydantic import BaseModel
from typing import Optional


class CategoryCreateSchema(BaseModel):
    name: str


class CategoryUpdateSchema(BaseModel):
    name: Optional[str] = None


class CategoryResponseSchema(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True
