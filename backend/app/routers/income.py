from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.income import IncomeCreateSchema, IncomeResponseSchema
from app.schemas.pagination import PaginatedResponse
from app.schemas.batch import BatchCreateSchema


from app.services.income import create_income, get_incomes, get_income, delete_income, get_income_items_history
# from app.schemas.pagination import PaginatedResponse
from app.schemas.income_history import IncomeItemHistorySchema
from datetime import date


from app.services.batch import create_batch
from app.models.income import Income, IncomeItem
from app.core.dependencies import require_roles, get_current_user
from app.models.users import RoleEnum, User
from app.models.payment import IncomePayment
from app.models.kontragent import Kontragent

router = APIRouter(prefix="/incomes", tags=["Kirimlar"])


# ── Set prices schema ────────────────────────────────────────

class SetPriceItem(BaseModel):
    income_item_id: int
    price_usd: float
    exchange_rate: float
    markup_percent: float

class SetPricesSchema(BaseModel):
    items: List[SetPriceItem]
    naqd_amount: float = 0.0
    karta_amount: float = 0.0
    payment_type: str = "qarz"   # naqd / karta / aralash / qarz
    note: str | None = None      # kirim izohi (keyingi bosqichda ishlatamiz)


# ── Endpointlar ──────────────────────────────────────────────

@router.patch("/{income_id}/set-prices")
def set_income_prices(
    income_id: int,
    data: SetPricesSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """
    Admin narx kiritadi.
    Omborchi kirim yaratgandan keyin admin shu endpointga narx kiritadi.
    Batch yaratiladi, WarehouseStock yangilanadi.
    """
    income = db.query(Income).filter(
        Income.id == income_id,
        Income.is_active == True
    ).first()
    if not income:
        raise HTTPException(404, "Kirim topilmadi")



    updated = []
    jami_summa = 0.0  # ⬅️ butun kirim jami (tan narx bo'yicha)

    for price_data in data.items:
        income_item = db.query(IncomeItem).filter(
            IncomeItem.id == price_data.income_item_id,
            IncomeItem.income_id == income_id
        ).first()

        if not income_item:
            raise HTTPException(404, f"IncomeItem topilmadi: ID={price_data.income_item_id}")
        if income_item.batch_id:
            raise HTTPException(400, f"Narx allaqachon kiritilgan: item_id={price_data.income_item_id}")
        if not income_item.product_id or not income_item.quantity:
            raise HTTPException(400, f"Mahsulot yoki soni yo'q: item_id={price_data.income_item_id}")

        batch = create_batch(
            db=db,
            data=BatchCreateSchema(
                product_id=income_item.product_id,
                brand_id=income_item.brand_id,
                quantity=income_item.quantity,
                price_usd=price_data.price_usd,
                exchange_rate=price_data.exchange_rate,
                markup_percent=price_data.markup_percent
            ),
            income_id=income_id
        )
        income_item.batch_id = batch.id
        income_item.price_usd = price_data.price_usd
        income_item.exchange_rate = price_data.exchange_rate
        income_item.price_som = price_data.price_usd * price_data.exchange_rate




        # Bu item tan narxi = soni × (dollar × kurs)
        item_summa = income_item.quantity * price_data.price_usd * price_data.exchange_rate
        jami_summa += item_summa

        updated.append({
            "income_item_id": price_data.income_item_id,
            "batch_id": batch.id,
            "product_id": income_item.product_id,
            "sale_price": batch.sale_price
        })
        print(
            f"[INCOME] Narx kiritildi: item_id={price_data.income_item_id} | batch_id={batch.id} | narx={batch.sale_price:,.0f}")

    # ── PAYMENT yangilash ──
    payment = db.query(IncomePayment).filter(
        IncomePayment.income_id == income_id
    ).first()

    naqd = data.naqd_amount or 0.0
    karta = data.karta_amount or 0.0
    tolangan = naqd + karta
    qarz = max(jami_summa - tolangan, 0)

    if payment:
        payment.total_amount = jami_summa
        payment.naqd_amount = naqd
        payment.karta_amount = karta
        payment.debt_amount = qarz
        payment.is_paid = qarz <= 0
        payment.payment_type = data.payment_type
    else:
        payment = IncomePayment(
            income_id=income_id,
            total_amount=jami_summa,
            naqd_amount=naqd,
            karta_amount=karta,
            debt_amount=qarz,
            is_paid=qarz <= 0,
            payment_type=data.payment_type
        )
        db.add(payment)

    # ── KONTRAGENT qarzi ──
    if qarz > 0:
        kontragent = db.query(Kontragent).filter(
            Kontragent.id == income.kontragent_id
        ).first()
        if kontragent:
            kontragent.jami_qarz = (kontragent.jami_qarz or 0) + qarz
            print(f"[INCOME] Kontragent qarzi: {kontragent.name} | +{qarz:,.0f} | jami={kontragent.jami_qarz:,.0f}")

    db.commit()

    return {
        "ok": True,
        "message": f"{len(updated)} ta mahsulotga narx kiritildi",
        "jami_summa": jami_summa,
        "tolangan": tolangan,
        "qarz": qarz,
        "updated": updated
    }



@router.get("/", response_model=PaginatedResponse[IncomeResponseSchema])
def list_incomes(
    search: Optional[str] = Query(None, description="Kirim raqami bo'yicha qidirish"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Barcha kirimlar — sahifalab qaytariladi"""
    return get_incomes(db, search, page=page, page_size=page_size)


@router.get("/{income_id}", response_model=IncomeResponseSchema)
def detail_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Bitta kirim"""
    return get_income(db, income_id)


@router.post("/", response_model=IncomeResponseSchema)
def add_income(
    data: IncomeCreateSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Yangi kirim — admin, superadmin, skladchi"""
    return create_income(db, data, current_user)



@router.delete("/{income_id}")
def remove_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Kirim o'chirish — faqat admin va superadmin"""
    return delete_income(db, income_id)


@router.get("/history/items", response_model=PaginatedResponse[IncomeItemHistorySchema])
def income_items_history(
    product_id: Optional[int] = Query(None),
    kontragent_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Kirim tarixi — mahsulot, kontragent, sana bo'yicha filtrlanadi (admin, superadmin, omborchi ko'radi)"""
    return get_income_items_history(db, product_id, kontragent_id, date_from, date_to, page, page_size)
