from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.cash_register import CashRegisterStatusSchema, CashCollectSchema
from app.services.cash_register import get_status, collect_cash
from app.core.dependencies import require_roles
from app.models.users import RoleEnum, User

router = APIRouter(prefix="/cash-register", tags=["Kassa yig'ish"])


@router.get("/", response_model=CashRegisterStatusSchema)
def status(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.buxgalter))
):
    """Hozirgi yig'ilmagan (kunlik/oylik) summa holati"""
    return get_status(db)


@router.post("/collect")
def collect(
    data: CashCollectSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.buxgalter))
):
    """Yig'ilmagan summani Sefga o'tkazish"""
    return collect_cash(db, current_user, data.note)
