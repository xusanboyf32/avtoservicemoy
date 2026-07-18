from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.base import get_db
from app.schemas.kontragent_return import (
    KontragentReturnCreateSchema, KontragentReturnResponseSchema, KontragentReturnPaySchema
)
from app.services.kontragent_return import (
    create_kontragent_return, get_kontragent_returns, pay_kontragent_return_debt
)
from app.core.dependencies import require_roles
from app.models.users import RoleEnum, User

router = APIRouter(prefix="/kontragent-returns", tags=["Kontragent qaytarish"])


@router.get("/", response_model=list[KontragentReturnResponseSchema])
def list_returns(
    kontragent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.skladchi))
):
    """Kontragentga qaytarilgan mahsulotlar ro'yxati"""
    return get_kontragent_returns(db, kontragent_id)


@router.post("/", response_model=KontragentReturnResponseSchema)
def add_return(
    data: KontragentReturnCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.skladchi))
):
    """Kontragentga mahsulot qaytarish (LIFO taqsimlash bilan)"""
    return create_kontragent_return(db, data, current_user)


@router.post("/{kontragent_id}/pay")
def pay_return_debt(
    kontragent_id: int,
    data: KontragentReturnPaySchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Kontragent bizga qarzini to'laydi (FIFO taqsimlanadi, Sefga kirim yoziladi)"""
    return pay_kontragent_return_debt(db, kontragent_id, data, current_user)

