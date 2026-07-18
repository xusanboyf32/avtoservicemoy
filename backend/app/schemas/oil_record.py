from datetime import date as DateType
from typing import Optional
from pydantic import BaseModel



class OilRecordCreateSchema(BaseModel):
    client_id: int
    date: Optional[DateType] = None
    oil_brand: Optional[str] = None
    oil_type: Optional[str] = None
    mileage: Optional[int] = None
    transmission: Optional[str] = None
    next_date: Optional[DateType] = None
    oil_filter: bool = False
    salon_filter: bool = False
    spark_plug: bool = False
    air_filter: bool = False
    fuel_filter: bool = False
    pampers: bool = False
    master_name: Optional[str] = None
    master_phone: Optional[str] = None
    note: Optional[str] = None


class OilRecordUpdateSchema(BaseModel):
    date: Optional[DateType] = None
    oil_brand: Optional[str] = None
    oil_type: Optional[str] = None
    mileage: Optional[int] = None
    transmission: Optional[str] = None
    next_date: Optional[DateType] = None
    oil_filter: Optional[bool] = None
    salon_filter: Optional[bool] = None
    spark_plug: Optional[bool] = None
    air_filter: Optional[bool] = None
    fuel_filter: Optional[bool] = None
    pampers: Optional[bool] = None
    master_name: Optional[str] = None
    master_phone: Optional[str] = None
    note: Optional[str] = None


class OilRecordResponseSchema(BaseModel):
    id: int
    client_id: int
    date: DateType
    oil_brand: Optional[str] = None
    oil_type: Optional[str] = None
    mileage: Optional[int] = None
    transmission: Optional[str] = None
    next_date: Optional[DateType] = None
    oil_filter: bool
    salon_filter: bool
    spark_plug: bool
    air_filter: bool
    fuel_filter: bool
    pampers: bool
    master_name: Optional[str] = None
    master_phone: Optional[str] = None
    note: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

