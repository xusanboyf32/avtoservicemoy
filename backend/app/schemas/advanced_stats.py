from pydantic import BaseModel
from typing import Optional, List
from datetime import date as date_type


class DateRangeFilter(BaseModel):
    date_from: Optional[date_type] = None
    date_to: Optional[date_type] = None


class OverviewSchema(BaseModel):
    total_sales: float          # jami savdo (final_amount yig'indisi)
    naqd_amount: float
    karta_amount: float
    debt_amount: float          # qarzga ketgan
    return_amount: float        # qaytarilgan
    safe_kirim: float           # Sefga tushgan (kontragent to'lovlari va h.k.)
    safe_chiqim: float          # Sefdan chiqqan (xarajat, maosh, kontragentga to'lov)
    net_profit: float           # sof: total_sales - return_amount - safe_chiqim (oddiy taxminiy)
    sales_count: int            # nechta chek


class DailyTrendPointSchema(BaseModel):
    date: date_type
    total_sales: float
    naqd_amount: float
    karta_amount: float


class TopProductSchema(BaseModel):
    product_id: int
    product_name: str
    total_quantity: int
    total_amount: float


class CashierStatSchema(BaseModel):
    kassir_id: int
    username: str
    full_name: Optional[str] = None
    total_sales: float
    sales_count: int
    naqd_amount: float
    karta_amount: float


class KontragentStatSchema(BaseModel):
    kontragent_id: int
    name: str
    jami_kirim: float          # undan olingan tovar summasi
    jami_tolangan: float       # unga to'langan
    jami_qarz: float           # hozirgi qarz


class ExpenseCategorySchema(BaseModel):
    note_prefix: str            # taxminiy kategoriya (note asosida)
    total_amount: float
    count: int
