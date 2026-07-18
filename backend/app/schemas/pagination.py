from pydantic import BaseModel
from typing import Generic, TypeVar, List

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """
    Barcha ro'yxat endpointlari uchun umumiy pagination format.
    """
    total: int
    page: int
    page_size: int
    items: List[T]

    class Config:
        from_attributes = True


