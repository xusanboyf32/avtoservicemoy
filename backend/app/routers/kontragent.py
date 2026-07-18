from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.base import get_db
from app.schemas.kontragent import KontragentResponseSchema

from app.services.kontragent import get_kontragents, get_kontragent, get_my_incomes, get_my_debts, pay_kontragent, get_kontragent_payments, get_my_payments, create_kontragent, update_kontragent, delete_kontragent
from app.schemas.kontragent import KontragentCreateSchema, KontragentUpdateSchema

from app.core.dependencies import require_roles, get_current_user
from app.models.users import RoleEnum, User

router = APIRouter(prefix="/kontragents", tags=["Kontragentlar"])



class KontragentPaySchema(BaseModel):
    naqd_amount: float = 0.0
    karta_amount: float = 0.0
    payment_type: str = "naqd"   # naqd / karta / aralash
    note: str | None = None




@router.get("/", response_model=list[KontragentResponseSchema])
def list_kontragents(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Barcha kontragentlar — admin, superadmin, skladchi"""
    return get_kontragents(db)


@router.post("/", response_model=KontragentResponseSchema)
def add_kontragent(
    data: KontragentCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Yangi kontragent — admin va superadmin (avtomatik login uchun user ham yaratiladi)"""
    return create_kontragent(db, data)


@router.put("/{kontragent_id}", response_model=KontragentResponseSchema)
def edit_kontragent(
    kontragent_id: int,
    data: KontragentUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kontragent yangilash — admin va superadmin"""
    return update_kontragent(db, kontragent_id, data)


@router.delete("/{kontragent_id}")
def remove_kontragent(
    kontragent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kontragent o'chirish — admin va superadmin"""
    return delete_kontragent(db, kontragent_id)





@router.post("/{kontragent_id}/pay")
def pay_kontragent_debt(
    kontragent_id: int,
    data: KontragentPaySchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Admin kontragentga to'lov qiladi — qarz kamayadi, Sefdan chiqim yoziladi"""
    return pay_kontragent(
        db,
        kontragent_id,
        naqd_amount=data.naqd_amount,
        karta_amount=data.karta_amount,
        payment_type=data.payment_type,
        note=data.note,
        current_user=current_user
    )





@router.get("/me/incomes")
def my_incomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.kontragent))
):
    """Kontragent o'z kirimlarini ko'radi"""
    return get_my_incomes(db, current_user)






@router.get("/me/debts")
def my_debts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.kontragent))
):
    """Kontragent o'z qarzlarini ko'radi"""
    return get_my_debts(db, current_user)





@router.get("/me/payments")
def my_payments(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(RoleEnum.kontragent))
):
    """Kontragent o'z to'lov tarixi"""
    return get_my_payments(db, current_user.id)




@router.get("/{kontragent_id}/payments")
def kontragent_payments_history(
    kontragent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kontragent to'lov tarixi"""
    return get_kontragent_payments(db, kontragent_id)



@router.get("/{kontragent_id}", response_model=KontragentResponseSchema)
def detail_kontragent(
    kontragent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Bitta kontragent — admin, superadmin, skladchi"""
    return get_kontragent(db, kontragent_id)




#####################################################################













# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from app.db.base import get_db
# from app.schemas.kontragent import KontragentCreateSchema, KontragentUpdateSchema, KontragentResponseSchema
# from app.services.kontragent import create_kontragent, get_kontragents, get_kontragent, update_kontragent, delete_kontragent
# from app.core.dependencies import require_roles
# from app.models.users import RoleEnum
# from app.services.kontragent import (
#     create_kontragent, get_kontragents, get_kontragent,
#     update_kontragent, delete_kontragent,
#     get_my_incomes, get_my_debts
# )
# from app.core.dependencies import get_current_user
# from app.models.users import User
#
#
# router = APIRouter(prefix="/kontragents", tags=["Kontragentlar"])
#
#
# @router.get("/", response_model=list[KontragentResponseSchema])
# def list_kontragents(
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.skladchi
#     ))
# ):
#     """Barcha kontragentlar — admin, superadmin, skladchi"""
#     return get_kontragents(db)
#
#
# @router.get("/{kontragent_id}", response_model=KontragentResponseSchema)
# def detail_kontragent(
#     kontragent_id: int,
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.skladchi
#     ))
# ):
#     """Bitta kontragent — admin, superadmin, skladchi"""
#     return get_kontragent(db, kontragent_id)
#
#
# @router.post("/", response_model=KontragentResponseSchema)
# def add_kontragent(
#     data: KontragentCreateSchema,
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.skladchi
#     ))
# ):
#     """Yangi kontragent — admin, superadmin, skladchi"""
#     return create_kontragent(db, data)
#
#
# @router.put("/{kontragent_id}", response_model=KontragentResponseSchema)
# def edit_kontragent(
#     kontragent_id: int,
#     data: KontragentUpdateSchema,
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin
#     ))
# ):
#     """Kontragent yangilash — admin va superadmin"""
#     return update_kontragent(db, kontragent_id, data)
#
#
# @router.delete("/{kontragent_id}")
# def remove_kontragent(
#     kontragent_id: int,
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin
#     ))
# ):
#     """Kontragent o'chirish — admin va superadmin"""
#     return delete_kontragent(db, kontragent_id)
#
#
#
#
#
#
# @router.get("/me/incomes")
# def my_incomes(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles(RoleEnum.kontragent))
# ):
#     """Kontragent o'z kirimlarini ko'radi"""
#     return get_my_incomes(db, current_user)
#
#
# @router.get("/me/debts")
# def my_debts(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(require_roles(RoleEnum.kontragent))
# ):
#     """Kontragent o'z qarzlarini ko'radi"""
#     return get_my_debts(db, current_user)
#
