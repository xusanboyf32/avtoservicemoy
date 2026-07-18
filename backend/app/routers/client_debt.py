from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db

from app.schemas.client_debt import ClientDebtPaymentCreateSchema, ClientDebtPaymentResponseSchema, ClientDebtResponseSchema, ClientTotalPaymentCreateSchema
from app.services.client_debt import get_client_debts, get_all_debts, pay_client_debt, pay_client_total_debt


from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/client-debts", tags=["Mijoz qarzlari"])


@router.get("/", response_model=list[ClientDebtResponseSchema])
def list_debts(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Barcha to'lanmagan qarzlar"""
    return get_all_debts(db)


@router.get("/client/{client_id}")
def client_debt_detail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Mijozning barcha qarzlari va to'lovlari"""
    return get_client_debts(db, client_id)



@router.patch("/{debt_id}/pay", response_model=ClientDebtResponseSchema)
def pay_debt(
    debt_id: int,
    data: ClientDebtPaymentCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bitta qarzga to'lov (eski usul, alohida debt_id bo'yicha)"""
    return pay_client_debt(db, debt_id, data)


@router.post("/client/{client_id}/pay")
def pay_client_total(
    client_id: int,
    data: ClientTotalPaymentCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Mijozning UMUMIY qarziga to'lov — eng eski qarzdan boshlab avtomatik taqsimlanadi (FIFO)"""
    return pay_client_total_debt(db, client_id, data)



