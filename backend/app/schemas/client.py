from pydantic import BaseModel
from typing import Optional


class ClientCreateSchema(BaseModel):
    full_name: str
    phone: Optional[str] = None
    car_number: Optional[str] = None
    car_model: Optional[str] = None


class ClientUpdateSchema(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    car_number: Optional[str] = None
    car_model: Optional[str] = None


class ClientResponseSchema(BaseModel):
    id: int
    full_name: str
    phone: Optional[str] = None
    car_number: Optional[str] = None
    car_model: Optional[str] = None
    jami_qarz: float
    is_active: bool
    last_oil_date: Optional[str] = None
    next_oil_date: Optional[str] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True

