from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.daily_stat import DailyStatResponseSchema
from app.services.daily_stat import get_daily_stat, get_monthly_stats
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/stats", tags=["Statistika"])


@router.get("/today", response_model=DailyStatResponseSchema)
def today_stat(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bugungi statistika"""
    return get_daily_stat(db)


@router.get("/monthly", response_model=list[DailyStatResponseSchema])
def monthly_stat(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Oylik statistika"""
    return get_monthly_stats(db)

