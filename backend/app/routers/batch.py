from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.batch import BatchCreateSchema, BatchResponseSchema
from app.services.batch import create_batch, get_current_batch, get_product_stock, get_all_stock, get_product_batches, get_warehouse_stock, get_kassa_stock_view
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/batches", tags=["Partiyalar"])


@router.get("/stock", response_model=list)
def all_stock(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Barcha mahsulotlar joriy holati"""
    return get_all_stock(db)




@router.get("/warehouse-stock", response_model=list)
def warehouse_stock(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Ombor qoldig'i — omborchi sotuvi uchun"""
    return get_warehouse_stock(db)




@router.get("/kassa-stock-view", response_model=list)
def kassa_stock_view(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi,
        RoleEnum.kassir

    ))
):
    """Kassa uchun stock — omborchi kassaga yuborish uchun ko'radi"""
    return get_kassa_stock_view(db)




@router.get("/{product_id}/current")
def current_batch(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Mahsulotning joriy aktiv partiyasi"""
    batch = get_current_batch(db, product_id)
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mahsulot omborda mavjud emas!"
        )
    return batch


@router.get("/{product_id}/stock")
def product_stock(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Bitta mahsulot joriy holati"""
    return get_product_stock(db, product_id)




@router.get("/{product_id}/history")
def product_batches(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulotning partiya tarixi — faqat admin"""
    return get_product_batches(db, product_id)


@router.post("/", response_model=BatchResponseSchema)
def add_batch(
    data: BatchCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Yangi partiya — admin va superadmin"""
    return create_batch(db, data)
