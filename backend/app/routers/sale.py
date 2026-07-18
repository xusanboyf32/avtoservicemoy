# from fastapi import APIRouter, Depends, Query
# from sqlalchemy.orm import Session
# from typing import Optional
# from app.db.base import get_db
# from app.schemas.sale import SaleCreateSchema, SaleResponseSchema
# from app.services.sale import create_sale, get_sales, get_sale, return_sale_item
# from app.core.dependencies import require_roles, get_current_user
# from app.models.users import RoleEnum, User
#
# router = APIRouter(prefix="/sales", tags=["Savdolar"])
#
#


#
# @router.get("/", response_model=list[SaleResponseSchema])
# def list_sales(
#     client_id: Optional[int] = Query(None, description="Mijoz bo'yicha filter"),
#     db: Session = Depends(get_db),
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.kassir
#     ))
# ):
#     """Barcha savdolar"""
#     return get_sales(db, client_id=client_id)




from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.base import get_db
from app.schemas.sale import SaleCreateSchema, SaleResponseSchema, SaleReturnResponseSchema
from app.schemas.pagination import PaginatedResponse
from app.services.sale import create_sale, get_sales, get_sale, return_sale_item, search_sales, create_ombor_sale, get_sale_returns
from app.core.dependencies import require_roles, get_current_user
from app.models.users import RoleEnum, User

router = APIRouter(prefix="/sales", tags=["Savdolar"])


@router.get("/", response_model=PaginatedResponse[SaleResponseSchema])
def list_sales(
    client_id: Optional[int] = Query(None, description="Mijoz bo'yicha filter"),
    page: int = Query(1, ge=1, description="Sahifa raqami"),
    page_size: int = Query(50, ge=1, le=200, description="Sahifadagi yozuvlar soni"),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Barcha savdolar — sahifalab qaytariladi (eng yangi savdo birinchi)"""
    # Omborchi faqat ombor sotuvlarini, kassir faqat kassa sotuvlarini ko'radi
    if current_user.role == RoleEnum.skladchi:
        manba = "ombor"
    elif current_user.role == RoleEnum.kassir:
        manba = "kassa"
    else:
        manba = None   # admin/superadmin hammasini ko'radi
    return get_sales(db, client_id=client_id, page=page, page_size=page_size, manba=manba)



@router.get("/search/query", response_model=PaginatedResponse[SaleResponseSchema])
def search_sale(
    q: str = Query("", description="ID, ism, telefon yoki mashina raqami"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir
    ))
):
    """Savdo qidirish: ID / ism / telefon / mashina"""
    return search_sales(db, q, page, page_size)





@router.get("/returns/list", response_model=PaginatedResponse[SaleReturnResponseSchema])
def list_sale_returns(
    sale_id: Optional[int] = Query(None, description="Bitta savdo bo'yicha filter"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.skladchi
    ))
):
    """Qaytgan mahsulotlar ro'yxati (manba va/yoki savdo bo'yicha)"""
    if current_user.role == RoleEnum.skladchi:
        manba = "ombor"
    elif current_user.role == RoleEnum.kassir:
        manba = "kassa"
    else:
        manba = None
    return get_sale_returns(db, manba=manba, sale_id=sale_id, page=page, page_size=page_size)




@router.get("/{sale_id}", response_model=SaleResponseSchema)
def detail_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bitta savdo"""
    return get_sale(db, sale_id)


@router.post("/", response_model=SaleResponseSchema)
def add_sale(
    data: SaleCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Yangi savdo — kassir"""
    return create_sale(db, data, current_user)





# ⬇️ SHU YERGA — add_sale dan keyin, return_item dan oldin
@router.post("/ombor", response_model=SaleResponseSchema)
def add_ombor_sale(
    data: SaleCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Ombor savdo — omborchi (ombordan sotadi, narx erkin)"""
    return create_ombor_sale(db, data, current_user)





@router.delete("/{sale_id}/items/{sale_item_id}", response_model=SaleResponseSchema)
def return_item(
    sale_id: int,
    sale_item_id: int,
    quantity: Optional[float] = Query(None),
    return_type: str = Query("naqd", description="naqd / karta / aralash / qarz"),
    naqd_amount: float = Query(0),
    karta_amount: float = Query(0),
    return_amount: float = Query(0, description="Qo'lda kiritilgan summa (0 = default yaxlit hisob)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.skladchi
    ))
):
    """Mahsulot qaytarish (usul + summa bilan)"""
    return return_sale_item(
        db, sale_id, sale_item_id,
        quantity=quantity,
        return_type=return_type,
        naqd_amount=naqd_amount,
        karta_amount=karta_amount,
        return_amount=return_amount,
        current_user=current_user,
    )


