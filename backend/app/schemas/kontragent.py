from pydantic import BaseModel
from typing import Optional


class KontragentCreateSchema(BaseModel):
    name: str
    phone: Optional[str] = None
    #Login uchun
    username: str
    password: str


class KontragentUpdateSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    user_id: Optional[int] = None


class KontragentResponseSchema(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    user_id: Optional[int] = None
    jami_qarz: float = 0.0
    menga_qarzi: float = 0.0
    is_active: bool

    class Config:
        from_attributes = True

