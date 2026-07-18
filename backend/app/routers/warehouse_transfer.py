from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.base import get_db
from app.schemas.warehouse_transfer import (
    WarehouseTransferCreateSchema,
    WarehouseTransferResponseSchema
)
from app.services.warehouse_transfer import (
    create_transfer, confirm_transfer,
    reject_transfer, get_transfers, get_transfer
)
from app.core.dependencies import require_roles
from app.models.users import RoleEnum, User
from app.models.warehouse_transfer import TransferStatus

router = APIRouter(prefix="/transfers", tags=["Transferlar"])



@router.get("/", response_model=list[WarehouseTransferResponseSchema])
def list_transfers(
    status: Optional[TransferStatus] = Query(None, description="Status bo'yicha filter"),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Barcha transferlar — kassir faqat o'ziga yuborilganini ko'radi"""
    # Kassir → faqat o'ziga belgilangan guruhlar; admin/omborchi/superadmin → hammasi
    if current_user.role == RoleEnum.kassir:
        return get_transfers(db, status_filter=status, kassir_id=current_user.id)
    return get_transfers(db, status_filter=status)





@router.get("/{transfer_id}", response_model=WarehouseTransferResponseSchema)
def detail_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Bitta transfer"""
    return get_transfer(db, transfer_id)





@router.post("/", response_model=WarehouseTransferResponseSchema)
def add_transfer(
    data: WarehouseTransferCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Yangi transfer — omborchi yuboradi"""
    return create_transfer(db, data, current_user)






@router.patch("/{transfer_id}/confirm", response_model=WarehouseTransferResponseSchema)
def confirm(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    Transfer qabul qilish — kassir faqat tugma bosadi.
    confirmed_quantity avtomatik sent_quantity ga teng bo'ladi.
    Body kiritish shart emas.
    """
    return confirm_transfer(db, transfer_id, current_user)


@router.patch("/{transfer_id}/reject", response_model=WarehouseTransferResponseSchema)
def reject(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Transfer rad etish — kassir faqat tugma bosadi"""
    return reject_transfer(db, transfer_id, current_user)

