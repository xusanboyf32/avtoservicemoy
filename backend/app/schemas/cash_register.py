from pydantic import BaseModel
from typing import Optional
from datetime import date as date_type


class CashRegisterStatusSchema(BaseModel):
    kunlik_naqd: float
    kunlik_karta: float
    oylik_naqd: float
    oylik_karta: float
    last_date: date_type

    class Config:
        from_attributes = True


class CashCollectSchema(BaseModel):
    note: Optional[str] = None

