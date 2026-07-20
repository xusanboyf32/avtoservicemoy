from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db


from app.models.client import Client
from app.models.client_debt import ClientDebt, ClientDebtPayment
from app.models.product import Product
from app.models.category import Category
from app.models.batch import Batch, BatchStatus
from app.models.oil_record import OilRecord
from app.core.client_deps import get_current_client
from app.schemas.client_auth import ClientLoginRequest
from app.services.client_auth import login_client

router = APIRouter(prefix="/client", tags=["Client Portal"])


# ---------- LOGIN ----------
@router.post("/login")
def client_login(request: ClientLoginRequest, db: Session = Depends(get_db)):
    return login_client(db, request.phone, request.password)


# ---------- PROFIL ----------
@router.get("/me")
def my_profile(client: Client = Depends(get_current_client)):
    debt = client.jami_qarz or 0
    return {
        "id": client.id,
        "full_name": client.full_name,
        "phone": client.phone,
        "car_number": client.car_number,
        "car_model": client.car_model,
        "jami_qarz": debt,
        "status": "Qarzingiz bor" if debt > 0 else "To'langan",
    }


# ---------- QARZLAR ----------
@router.get("/debts")
def my_debts(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    debts = (
        db.query(ClientDebt)
        .filter(ClientDebt.client_id == client.id)
        .order_by(ClientDebt.id.desc())
        .all()
    )

    result = []
    jami_qarz = 0.0
    jami_tolangan = 0.0
    jami_qolgan = 0.0

    for d in debts:
        # Har bir qarzning to'lov tarixi
        payments = (
            db.query(ClientDebtPayment)
            .filter(ClientDebtPayment.debt_id == d.id)
            .order_by(ClientDebtPayment.id.desc())
            .all()
        )
        payment_list = [
            {
                "amount": p.amount,
                "payment_type": p.payment_type.value if p.payment_type else None,
                "sana": p.created_at.isoformat() if getattr(p, "created_at", None) else None,
                "note": p.note,
            }
            for p in payments
        ]

        jami_qarz += d.total_amount or 0
        jami_tolangan += d.paid_amount or 0
        jami_qolgan += d.debt_amount or 0

        result.append({
            "id": d.id,
            "total_amount": d.total_amount,     # boshlang'ich qarz
            "paid_amount": d.paid_amount,       # to'langan
            "debt_amount": d.debt_amount,       # qolgan
            "is_paid": d.is_paid,
            "sana": d.created_at.isoformat() if getattr(d, "created_at", None) else None,
            "note": d.note,
            "payments": payment_list,
        })

    return {
        "jami_qarz": jami_qarz,
        "jami_tolangan": jami_tolangan,
        "jami_qolgan": jami_qolgan,
        "debts": result,
    }


# ---------- KATEGORIYALAR (filter uchun) ----------
@router.get("/categories")
def client_categories(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    cats = db.query(Category).order_by(Category.name).all()
    return [{"id": c.id, "name": c.name} for c in cats]


# ---------- MAHSULOTLAR (aktiv narx + kategoriya) ----------
@router.get("/products")
def client_products(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    products = db.query(Product).order_by(Product.name).all()
    result = []
    for p in products:
        # Aktiv batchni topamiz (is_current -> bo'lmasa aktiv status)
        batch = (
            db.query(Batch)
            .filter(Batch.product_id == p.id, Batch.is_current == True)
            .first()
        )
        if batch is None:
            batch = (
                db.query(Batch)
                .filter(Batch.product_id == p.id, Batch.status == BatchStatus.aktiv)
                .order_by(Batch.id.desc())
                .first()
            )

        # Batch yo'q bo'lsa (mahsulot hali sotuvda yo'q) — ko'rsatmaymiz
        if batch is None:
            continue

        result.append({
            "id": p.id,
            "name": p.name,
            "price": batch.sale_price,  # faqat sotuv narxi (aktiv batch)
            "image_url": p.image_url,  # baza'dagi rasm
            "category_id": p.category_id,
            "category_name": p.category.name if p.category else None,
            "unit": p.unit.name if p.unit else None,
        })



    return result




# ---------- PROBEG (moy almashtirish tarixi) ----------
@router.get("/oil-records")
def my_oil_records(
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    records = (
        db.query(OilRecord)
        .filter(OilRecord.client_id == client.id)
        .order_by(OilRecord.date.desc(), OilRecord.id.desc())
        .all()
    )
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "sana": r.date.isoformat() if r.date else None,
            "oil_brand": r.oil_brand,
            "oil_type": r.oil_type,
            "mileage": r.mileage,
            "transmission": r.transmission,
            "next_date": r.next_date.isoformat() if r.next_date else None,
            "master_name": r.master_name,
            "filtrlar": {
                "oil_filter": r.oil_filter,
                "air_filter": r.air_filter,
                "salon_filter": r.salon_filter,
                "spark_plug": r.spark_plug,
                "fuel_filter": r.fuel_filter,
                "pampers": r.pampers,
            },
        })
    return result
