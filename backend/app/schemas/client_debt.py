from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.client_debt import DebtPaymentType
from app.schemas.client import ClientResponseSchema


class ClientDebtResponseSchema(BaseModel):
    id: int
    client_id: int
    sale_id: int
    total_amount: float
    paid_amount: float
    debt_amount: float
    is_paid: bool
    note: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    client: ClientResponseSchema

    class Config:
        from_attributes = True




class ClientDebtPaymentCreateSchema(BaseModel):
    amount: float
    payment_type: DebtPaymentType
    naqd_amount: Optional[float] = None   # faqat payment_type='aralash' bo'lsa ishlatiladi
    karta_amount: Optional[float] = None  # faqat payment_type='aralash' bo'lsa ishlatiladi
    note: Optional[str] = None




class ClientTotalPaymentCreateSchema(BaseModel):
    """Mijozning umumiy (barcha cheklar bo'yicha) qarziga to'lov — eng eskisidan boshlab taqsimlanadi"""
    amount: float
    payment_type: DebtPaymentType
    naqd_amount: Optional[float] = None
    karta_amount: Optional[float] = None
    note: Optional[str] = None



class ClientDebtPaymentResponseSchema(BaseModel):
    id: int
    debt_id: int
    client_id: int
    amount: float
    payment_type: DebtPaymentType
    note: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class ClientDebtDetailSchema(BaseModel):
    """Mijozning barcha qarzlari"""
    client: ClientResponseSchema
    jami_qarz: float
    qarzlar: List[ClientDebtResponseSchema]
    tolovlar: List[ClientDebtPaymentResponseSchema]

    class Config:
        from_attributes = True




