from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.kassa_page import KassaPageUpdateSchema, KassaPageResponseSchema
from app.services.kassa_page import get_all_pages, get_page, update_page, clear_page, get_empty_page
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/kassa-pages", tags=["Kassa pagelar"])


@router.get("/", response_model=list[KassaPageResponseSchema])
def list_pages(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Barcha 17 ta kassa page"""
    return get_all_pages(db)


@router.get("/empty", response_model=KassaPageResponseSchema)
def empty_page(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bo'sh page topish — kamera uchun"""
    return get_empty_page(db)


@router.get("/{page_number}", response_model=KassaPageResponseSchema)
def detail_page(
    page_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bitta page"""
    return get_page(db, page_number)


@router.patch("/{page_number}", response_model=KassaPageResponseSchema)
def edit_page(
    page_number: int,
    data: KassaPageUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Page yangilash — savatcha, mijoz"""
    return update_page(db, page_number, data)


@router.delete("/{page_number}/clear", response_model=KassaPageResponseSchema)
def clean_page(
    page_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Page tozalash — TOZALASH tugmasi"""
    return clear_page(db, page_number)

