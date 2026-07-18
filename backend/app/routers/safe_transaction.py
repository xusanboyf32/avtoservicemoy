from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.db.base import get_db
from app.schemas.safe_transaction import SafeTransactionCreateSchema, SafeTransactionResponseSchema, SafeBalanceSchema
from app.schemas.pagination import PaginatedResponse
from app.services.safe_transaction import create_transaction, get_balance, get_transactions, get_worker_expenses_summary
from app.core.dependencies import require_roles
from app.models.users import RoleEnum, User

router = APIRouter(prefix="/safe", tags=["Admin Sefi"])




@router.get("/balance", response_model=SafeBalanceSchema)
def balance(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.buxgalter))
):
    """Joriy Sef balansi"""
    return get_balance(db)


@router.get("/", response_model=PaginatedResponse[SafeTransactionResponseSchema])
def list_transactions(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    kontragent_id: Optional[int] = Query(None),
    related_user_id: Optional[int] = Query(None),
    note_search: Optional[str] = Query(None, description="Izoh (note) bo'yicha qidirish, masalan 'ehson'"),
    direction: Optional[str] = Query(None, description="kirim / chiqim"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin, RoleEnum.buxgalter))
):
    """Sef tranzaksiyalari — filtrlar bilan (sana, kontragent, xodim, izoh matni, yo'nalish)"""
    return get_transactions(db, date_from, date_to, kontragent_id, related_user_id, note_search, direction, page, page_size)





@router.get("/workers-summary")
def workers_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Xodimlarga berilgan maoshlar bo'yicha jami hisobot"""
    return get_worker_expenses_summary(db)


@router.post("/", response_model=SafeTransactionResponseSchema)
def add_transaction(
    data: SafeTransactionCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Qo'lda kirim yoki chiqim yozish"""
    return create_transaction(db, data, current_user)
