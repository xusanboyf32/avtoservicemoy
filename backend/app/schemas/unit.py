from pydantic import BaseModel
from typing import Optional


class UnitCreateSchema(BaseModel):
    name: str


class UnitUpdateSchema(BaseModel):
    name: Optional[str] = None


class UnitResponseSchema(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True

