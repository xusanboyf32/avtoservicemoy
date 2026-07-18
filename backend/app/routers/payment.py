from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.payment import IncomePaymentUpdateSchema, IncomePaymentResponseSchema
from app.services.payment import update_payment, get_payment, get_debts
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/payments", tags=["To'lovlar"])


@router.get("/debts", response_model=list[IncomePaymentResponseSchema])
def list_debts(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Barcha qarzlar ro'yxati — admin va superadmin"""
    return get_debts(db)


@router.get("/{income_id}", response_model=IncomePaymentResponseSchema)
def detail_payment(
    income_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Bitta kirim to'lovi — admin va superadmin"""
    return get_payment(db, income_id)


@router.patch("/{income_id}", response_model=IncomePaymentResponseSchema)
def pay_debt(
    income_id: int,
    data: IncomePaymentUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Qarz to'lash — admin va superadmin"""
    return update_payment(db, income_id, data)
