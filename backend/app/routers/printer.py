from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.db.base import get_db
from app.models.sale import Sale, SaleItem
from app.models.client import Client
from app.models.oil_record import OilRecord
from app.models.batch import Batch
from app.models.users import User, RoleEnum
from app.core.dependencies import require_roles
from app.core.config import settings
from app.services.printer_service import print_receipt, print_test

router = APIRouter(prefix="/print", tags=["Printer"])


@router.post("/receipt/{sale_id}")
def print_receipt_endpoint(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    Kassir 'Chek chiqarish' bosganda chaqiriladi.
    Faqat aktiv (qaytarilmagan) mahsulotlar chiqadi.
    Hammasi qaytarilgan bo'lsa — chek chiqmaydi.
    """
    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items)
            .joinedload(SaleItem.batch)
            .joinedload(Batch.product),
            joinedload(Sale.kassir)
            .joinedload(User.profile)
        )
        .filter(Sale.id == sale_id)
        .first()
    )

    if not sale:
        raise HTTPException(status_code=404, detail="Savdo topilmadi")

    # Aktiv itemlar yo'q → chek chiqarma
    aktiv_items = [item for item in sale.items if item.is_active]
    if not aktiv_items:
        raise HTTPException(
            status_code=400,
            detail="Barcha mahsulotlar qaytarilgan — chek chiqarib bo'lmaydi"
        )

    # Mijoz (agar bogʻlangan boʻlsa)
    client = None
    if sale.client_id:
        client = db.query(Client).filter(
            Client.id == sale.client_id
        ).first()

    # Oxirgi probeg yozuvi (agar mijoz bor bo'lsa)
    oil_record = None
    if client:
        oil_record = db.query(OilRecord).filter(
            OilRecord.client_id == client.id,
            OilRecord.is_active == True
        ).order_by(OilRecord.date.desc()).first()

    return print_receipt(sale, client, oil_record)


@router.post("/test")
def print_test_endpoint(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """
    Printer ulangan-ulanmaganini tekshirish.
    Test cheki chiqaradi.
    """
    return print_test()


@router.get("/status")
def printer_status(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    Printer ulangan yoki ulanmaganini tekshirish.
    Frontend bu endpointni indikator uchun ishlatadi.
    """
    try:
        from escpos.printer import Win32Raw
        Win32Raw(settings.PRINTER_NAME)
        return {"connected": True, "printer": settings.PRINTER_NAME}
    except Exception as e:
        return {"connected": False, "printer": settings.PRINTER_NAME, "error": str(e)}