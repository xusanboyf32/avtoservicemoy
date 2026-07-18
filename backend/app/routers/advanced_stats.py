from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.db.base import get_db
from app.schemas.advanced_stats import (
    OverviewSchema, DailyTrendPointSchema, TopProductSchema,
    CashierStatSchema, KontragentStatSchema, ExpenseCategorySchema
)
from app.services.advanced_stats import (
    get_overview, get_daily_trend, get_top_products,
    get_cashier_stats, get_kontragent_stats, get_expense_breakdown
)
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/advanced-stats", tags=["Kengaytirilgan statistika"])


@router.get("/overview", response_model=OverviewSchema)
def overview(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_overview(db, date_from, date_to)


@router.get("/daily-trend", response_model=list[DailyTrendPointSchema])
def daily_trend(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_daily_trend(db, date_from, date_to)


@router.get("/top-products", response_model=list[TopProductSchema])
def top_products(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_top_products(db, date_from, date_to, limit)


@router.get("/cashiers", response_model=list[CashierStatSchema])
def cashiers(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_cashier_stats(db, date_from, date_to)


@router.get("/kontragents", response_model=list[KontragentStatSchema])
def kontragents(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_kontragent_stats(db)


@router.get("/expenses", response_model=list[ExpenseCategorySchema])
def expenses(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    return get_expense_breakdown(db, date_from, date_to)
