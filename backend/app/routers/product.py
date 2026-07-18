from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.product import ProductCreateSchema, ProductUpdateSchema, ProductResponseSchema
from app.schemas.pagination import PaginatedResponse
from app.services.product import create_product, get_products, get_product, update_product, delete_product
from app.core.dependencies import require_roles
from app.models.users import RoleEnum
from typing import Optional

router = APIRouter(prefix="/products", tags=["Mahsulotlar"])


@router.get("/", response_model=PaginatedResponse[ProductResponseSchema])
def list_products(
    search: Optional[str] = Query(None, description="Nom, ID yoki shtrix kod bo'yicha qidirish"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi,
        RoleEnum.operator
    ))
):
    """Barcha mahsulotlar — sahifalab qaytariladi"""
    return get_products(db, search, page=page, page_size=page_size)






@router.get("/{product_id}", response_model=ProductResponseSchema)
def detail_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Bitta mahsulot — admin, superadmin, kassir, skladchi"""
    return get_product(db, product_id)


@router.post("/", response_model=ProductResponseSchema)
def add_product(
    data: ProductCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Yangi mahsulot — admin va superadmin"""
    return create_product(db, data)


@router.put("/{product_id}", response_model=ProductResponseSchema)
def edit_product(
    product_id: int,
    data: ProductUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulot yangilash — admin va superadmin"""
    return update_product(db, product_id, data)


@router.delete("/{product_id}")
def remove_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulot o'chirish — admin va superadmin"""
    return delete_product(db, product_id)

