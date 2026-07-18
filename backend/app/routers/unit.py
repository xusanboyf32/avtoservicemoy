from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.unit import UnitCreateSchema, UnitUpdateSchema, UnitResponseSchema
from app.services.unit import create_unit, get_units, get_unit, update_unit, delete_unit
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/units", tags=["O'lchov birliklari"])


@router.get("/", response_model=list[UnitResponseSchema])
def list_units(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi,
        RoleEnum.operator
    ))
):
    """Barcha o'lchov birliklari — hammaga"""
    return get_units(db)


@router.get("/{unit_id}", response_model=UnitResponseSchema)
def detail_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Bitta o'lchov birligi — admin va superadmin"""
    return get_unit(db, unit_id)


@router.post("/", response_model=UnitResponseSchema)
def add_unit(
    data: UnitCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Yangi o'lchov birligi — admin va superadmin"""
    return create_unit(db, data)


@router.put("/{unit_id}", response_model=UnitResponseSchema)
def edit_unit(
    unit_id: int,
    data: UnitUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """O'lchov birligi yangilash — admin va superadmin"""
    return update_unit(db, unit_id, data)


@router.delete("/{unit_id}")
def remove_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """O'lchov birligi o'chirish — admin va superadmin"""
    return delete_unit(db, unit_id)


