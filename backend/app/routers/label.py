from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.models.batch import Batch
from app.models.product import Product
from app.core.dependencies import require_roles
from app.models.users import RoleEnum
from app.core.config import settings
from app.services.label_service import print_label, print_label_batch, print_label_test

router = APIRouter(prefix="/label", tags=["Yorliq"])


# ── Schemalar ────────────────────────────────────────────────

class LabelRequest(BaseModel):
    """Bitta mahsulot uchun"""
    product_id: int
    quantity: int = 1


class LabelBatchItem(BaseModel):
    """Ko'p mahsulot ro'yxatidagi bitta element"""
    product_id: int
    quantity: int = 1


class LabelBatchRequest(BaseModel):
    """Ko'p mahsulot — navbat bilan chiqarish"""
    items: List[LabelBatchItem]


# ── Yordamchi funksiya ───────────────────────────────────────

def get_product_and_price(db: Session, product_id: int):
    """Bazadan mahsulot nomi va joriy narxni olish"""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(404, f"Mahsulot topilmadi: ID={product_id}")

    batch = db.query(Batch).filter(
        Batch.product_id == product_id,
        Batch.is_current == True,
        Batch.is_active == True
    ).first()

    price = int(batch.sale_price) if batch else 0
    return product, price


# ── Endpointlar ──────────────────────────────────────────────

@router.post("/print")
def print_single_label(
    data: LabelRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    USUL 1 — Bitta mahsulot yorlig'i.
    Kassir mahsulot ustidagi [🏷️] tugmasini bosadi.
    Nechta kerak bo'lsa quantity kiritadi.

    Misol: {product_id: 1, quantity: 20}
    → Olma yorlig'i 20 ta chiqadi
    """
    product, price = get_product_and_price(db, data.product_id)

    return print_label(
        product_id=data.product_id,
        product_name=product.name,
        price=price,
        quantity=data.quantity
    )


@router.post("/batch-print")
def print_batch_labels(
    data: LabelBatchRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    USUL 2 — Ko'p mahsulot, navbat bilan.
    Kassir ro'yxat tuzadi: har mahsulotga soni belgilaydi.
    Hammasi ketma-ket chiqadi.

    Misol:
    {
      "items": [
        {"product_id": 1, "quantity": 20},  → Olma 20 ta
        {"product_id": 2, "quantity": 15},  → Behi 15 ta
        {"product_id": 3, "quantity": 10}   → Nok 10 ta
      ]
    }
    Jami 45 ta yorliq ketma-ket chiqadi.
    """
    if not data.items:
        raise HTTPException(400, "Kamida bitta mahsulot kerak")

    if len(data.items) > 50:
        raise HTTPException(400, "Bir vaqtda maksimum 50 ta mahsulot")

    # Har mahsulot uchun bazadan ma'lumot olish
    batch_items = []
    for item in data.items:
        product, price = get_product_and_price(db, item.product_id)
        batch_items.append({
            "product_id": item.product_id,
            "product_name": product.name,
            "price": price,
            "quantity": item.quantity
        })

    return print_label_batch(batch_items)


@router.post("/test")
def label_test(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Godex ulangan-ulanmaganini tekshirish — test yorliq"""
    return print_label_test()


@router.get("/status")
def label_printer_status(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Godex printer holati"""
    try:
        from escpos.printer import Win32Raw
        Win32Raw(settings.GODEX_PRINTER_NAME)
        return {"connected": True, "printer": settings.GODEX_PRINTER_NAME}
    except Exception as e:
        return {"connected": False, "printer": settings.GODEX_PRINTER_NAME, "error": str(e)}

