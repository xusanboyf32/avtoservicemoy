from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.base import get_db
from app.schemas.client import ClientCreateSchema, ClientUpdateSchema, ClientResponseSchema
from app.schemas.client_debt import ClientDebtDetailSchema
from app.services.client import create_client, get_clients, get_client, update_client, delete_client, get_client_by_car_number
from app.services.client_debt import get_client_debts
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/clients", tags=["Mijozlar"])

#
# @router.get("/", response_model=list[ClientResponseSchema])
# def list_clients(
#     search: Optional[str] = Query(None, description="Ism, telefon yoki mashina raqami"),
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.kassir,
#         RoleEnum.operator
#     ))
# ):
#     """Barcha mijozlar — admin, superadmin, kassir, operator"""
#     return get_clients(db, search)
#

from app.schemas.pagination import PaginatedResponse

@router.get("/", response_model=PaginatedResponse[ClientResponseSchema])
def list_clients(
    search: Optional[str] = Query(None, description="Ism, telefon yoki mashina raqami"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Barcha mijozlar — sahifalab qaytariladi"""
    return get_clients(db, search, page=page, page_size=page_size)



@router.get("/car/{car_number}", response_model=ClientResponseSchema)
def client_by_car(
    car_number: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Mashina raqami bo'yicha mijoz — kamera uchun"""
    from fastapi import HTTPException, status
    client = get_client_by_car_number(db, car_number)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mijoz topilmadi!"
        )
    return client


@router.get("/{client_id}", response_model=ClientResponseSchema)
def detail_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Bitta mijoz"""
    return get_client(db, client_id)


@router.get("/{client_id}/debts")
def client_debts(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Mijoz qarzlari"""
    return get_client_debts(db, client_id)


@router.post("/", response_model=ClientResponseSchema)
def add_client(
    data: ClientCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.operator
    ))
):
    """Yangi mijoz"""
    return create_client(db, data)


@router.put("/{client_id}", response_model=ClientResponseSchema)
def edit_client(
    client_id: int,
    data: ClientUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Mijoz yangilash — faqat ism va mashina raqami"""
    return update_client(db, client_id, data)


@router.delete("/{client_id}")
def remove_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mijoz o'chirish — admin va superadmin"""
    return delete_client(db, client_id)

