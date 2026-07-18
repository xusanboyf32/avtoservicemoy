from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.category import CategoryCreateSchema, CategoryUpdateSchema, CategoryResponseSchema
from app.services.category import create_category, get_categories, get_category, update_category, delete_category
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/categories", tags=["Kategoriyalar"])


@router.get("/", response_model=list[CategoryResponseSchema])
def list_categories(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi,
        RoleEnum.operator
    ))
):
    """Barcha kategoriyalar — hammaga"""
    return get_categories(db)


@router.get("/{category_id}", response_model=CategoryResponseSchema)
def detail_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Bitta kategoriya — admin va superadmin"""
    return get_category(db, category_id)


@router.post("/", response_model=CategoryResponseSchema)
def add_category(
    data: CategoryCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Yangi kategoriya — admin va superadmin"""
    return create_category(db, data)


@router.put("/{category_id}", response_model=CategoryResponseSchema)
def edit_category(
    category_id: int,
    data: CategoryUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kategoriya yangilash — admin va superadmin"""
    return update_category(db, category_id, data)


@router.delete("/{category_id}")
def remove_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kategoriya o'chirish — admin va superadmin"""
    return delete_category(db, category_id)

