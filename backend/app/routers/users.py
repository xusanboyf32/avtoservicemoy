from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.users import UserCreateSchema, UserUpdateSchema, UserResponseSchema
from app.services.users import (
    create_user,
    get_users,
    get_user,
    update_user,
    delete_user,
    update_permission
)
from app.core.dependencies import get_current_user, require_roles
from app.models.users import User, RoleEnum

router = APIRouter(prefix="/users", tags=["Users"])


# ================================================
# USER RO'YXATI
# ================================================
@router.get("/", response_model=list[UserResponseSchema])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Barcha userlar ro'yxati — superadmin va admin"""
    return get_users(db)






# ================================================
# KASSIRLAR RO'YXATI — omborchi kassaga yuborish uchun
# ================================================

@router.get("/kassirlar/list", response_model=list)
def kassirlar_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.skladchi
    ))
):
    """Faol kassirlar ro'yxati (id + ism) — omborchi ko'radi"""
    kassirlar = db.query(User).filter(
        User.role == RoleEnum.kassir,
        User.is_active == True
    ).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.profile.full_name if u.profile else u.username,
        }
        for u in kassirlar
    ]




# ================================================
# BITTA USER
# ================================================
@router.get("/{user_id}", response_model=UserResponseSchema)
def detail_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Bitta user — superadmin va admin"""
    return get_user(db, user_id)


# ================================================
# USER YARATISH
# ================================================

@router.post("/", response_model=UserResponseSchema)
def add_user(
    data: UserCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Yangi user yaratish — superadmin va admin"""
    return create_user(db, data, current_user)


# ================================================
# USER YANGILASH
# ================================================
@router.put("/{user_id}", response_model=UserResponseSchema)
def edit_user(
    user_id: int,
    data: UserUpdateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """User yangilash — superadmin va admin (cheklovlar service ichida)"""
    return update_user(db, user_id, data, current_user)

# ================================================
# USER O'CHIRISH
# ================================================

@router.delete("/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """User o'chirish — superadmin va admin (cheklovlar service ichida)"""
    return delete_user(db, user_id, current_user)

# ================================================
# PERMISSION YANGILASH
# ================================================
@router.patch("/{user_id}/permission")
def edit_permission(
    user_id: int,
    perms: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.superadmin, RoleEnum.admin))
):
    """Permission yangilash — superadmin va admin (cheklovlar service ichida)"""
    return update_permission(db, user_id, perms, current_user)