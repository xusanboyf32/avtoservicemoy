from pydantic import BaseModel
from datetime import date


class DailyStatResponseSchema(BaseModel):
    id: int
    date: date
    total_sales: float
    cash_amount: float
    debt_amount: float

    card_amount: float
    mixed_amount: float

    return_amount: float
    monthly_sales: float
    monthly_cash: float
    monthly_debt: float

    class Config:
        from_attributes = True


