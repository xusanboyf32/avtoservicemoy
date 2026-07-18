from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.brand import BrandCreateSchema, BrandUpdateSchema, BrandResponseSchema
from app.services.brand import create_brand, get_brands, get_brand, update_brand, delete_brand
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/brands", tags=["Brandlar"])


@router.get("/", response_model=list[BrandResponseSchema])
def list_brands(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi,
        RoleEnum.operator
    ))
):
    """Barcha brandlar — hammaga"""
    return get_brands(db)


@router.get("/{brand_id}", response_model=BrandResponseSchema)
def detail_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Bitta brand — admin va superadmin"""
    return get_brand(db, brand_id)


@router.post("/", response_model=BrandResponseSchema)
def add_brand(
    data: BrandCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Yangi brand — admin, superadmin, skladchi"""
    return create_brand(db, data)


@router.put("/{brand_id}", response_model=BrandResponseSchema)
def edit_brand(
    brand_id: int,
    data: BrandUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Brand yangilash — admin va superadmin"""
    return update_brand(db, brand_id, data)


@router.delete("/{brand_id}")
def remove_brand(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Brand o'chirish — admin va superadmin"""
    return delete_brand(db, brand_id)
