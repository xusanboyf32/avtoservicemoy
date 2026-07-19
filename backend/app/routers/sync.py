"""
Sync router — kassa (local SQLite) bilan server (PostgreSQL) o'rtasida
ma'lumot almashinuvi. Kassir "serverga jo'nat" bosganda ishlaydi.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.core.dependencies import get_current_user
from app.models.users import User

router = APIRouter(prefix="/sync", tags=["sync"])



@router.post("/ping")
def sync_ping(current_user: User = Depends(get_current_user)):
    """
    Kassa serverga ulanishni test qiladi.
    Token to'g'ri bo'lsa — kim ulanganini qaytaradi.
    """
    return {
        "status": "ok",
        "message": "Server bilan aloqa bor",
        "user": current_user.username,
        "role": current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role),
    }


@router.get("/pull")
def sync_pull(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Server → Kassa: kassaga kerakli ma'lumotni beradi.
    Kassir "jo'nat" bosganda, avval shu chaqiriladi (olish qismi).

    Qaytaradi:
      - products:   mahsulotlar (nomi, barcode)
      - batches:    partiyalar (narx bilan) — faqat aktiv
      - transfers:  kassaga yuborilgan, hali qabul qilinmagan jo'natmalar
    """
    from app.models.product import Product
    from app.models.batch import Batch
    from app.models.warehouse_transfer import WarehouseTransfer, TransferItem, TransferStatus

    # 1. Mahsulotlar
    products = db.query(Product).all()
    products_out = [
        {
            "id": p.id,
            "name": p.name,
            "barcode": p.barcode,
            "category_id": p.category_id,
            "unit_id": p.unit_id,
        }
        for p in products
    ]

    # 2. Aktiv partiyalar (narx bilan)
    batches = db.query(Batch).filter(Batch.is_active == True).all()
    batches_out = [
        {
            "id": b.id,
            "product_id": b.product_id,
            "sale_price": b.sale_price,
            "is_current": b.is_current,
            "status": b.status.value if hasattr(b.status, "value") else str(b.status),
        }
        for b in batches
    ]

    # 3. Kassaga yuborilgan, hali qabul qilinmagan transferlar
    transfers = db.query(WarehouseTransfer).filter(
        WarehouseTransfer.status == TransferStatus.yuborildi,
        WarehouseTransfer.is_active == True,
    ).all()
    transfers_out = []
    for t in transfers:
        items = db.query(TransferItem).filter(TransferItem.transfer_id == t.id).all()
        transfers_out.append({
            "id": t.id,
            "kassir_id": t.kassir_id,
            "note": t.note,
            "items": [
                {"id": it.id, "batch_id": it.batch_id, "sent_quantity": it.sent_quantity}
                for it in items
            ],
        })

    return {
        "status": "ok",
        "products": products_out,
        "batches": batches_out,
        "transfers": transfers_out,
        "counts": {
            "products": len(products_out),
            "batches": len(batches_out),
            "transfers": len(transfers_out),
        },
    }



@router.post("/push")
def sync_push(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kassa → Server: kassadagi savdolarni serverga yuboradi.
    Kassir "jo'nat" bosganda (yuborish qismi).

    Kutiladigan format:
      { "sales": [ {savdo}, {savdo}, ... ] }

    Har savdo:
      sync_uuid, page_number, kassir_username, client_phone,
      total_amount, discount_amount, final_amount, paid_amount,
      naqd_amount, karta_amount, debt_amount, payment_type, note,
      created_at, items: [{batch_id, quantity, original_price,
                           sale_price, discount_percent, discount_amount, total}]

    Idempotent: sync_uuid allaqachon bor bo'lsa — o'tkazib yuboradi (dublikat yo'q).
    """
    from app.models.sale import Sale, SaleItem, PaymentType
    from app.models.kassa_stock import KassaStock
    from app.models.batch import Batch
    from app.models.users import User as UserModel
    from app.models.client import Client
    from app.services.batch import complete_batch

    sales_in = payload.get("sales", [])
    result = {"qabul": 0, "dublikat": 0, "xato": []}

    for s in sales_in:
        uuid = s.get("sync_uuid")

        # 1. Dublikat tekshiruvi (idempotent)
        if uuid:
            exists = db.query(Sale).filter(Sale.sync_uuid == uuid).first()
            if exists:
                result["dublikat"] += 1
                continue

        try:
            # 2. Kassir topish (username bilan)
            kassir = None
            if s.get("kassir_username"):
                kassir = db.query(UserModel).filter(
                    UserModel.username == s["kassir_username"]
                ).first()
            if not kassir:
                kassir = current_user  # topilmasa — jo'natgan foydalanuvchi

            # 3. Mijoz topish (telefon bilan, ixtiyoriy)
            client = None
            if s.get("client_phone"):
                client = db.query(Client).filter(
                    Client.phone == s["client_phone"]
                ).first()

            # 4. Savdo yaratish (TAYYOR — qayta hisoblamaymiz)
            sale = Sale(
                page_number=s.get("page_number", 1),
                kassir_id=kassir.id,
                client_id=client.id if client else None,
                total_amount=s.get("total_amount", 0),
                discount_amount=s.get("discount_amount", 0),
                final_amount=s.get("final_amount", 0),
                paid_amount=s.get("paid_amount", 0),
                naqd_amount=s.get("naqd_amount", 0),
                karta_amount=s.get("karta_amount", 0),
                debt_amount=s.get("debt_amount", 0),
                payment_type=PaymentType(s.get("payment_type", "naqd")),
                note=s.get("note"),
                manba="kassa",
                sync_uuid=uuid,
            )
            db.add(sale)
            db.flush()

            # 5. Har mahsulot: SaleItem + KassaStock dan "sotildi"ni ayirish
            for it in s.get("items", []):
                batch_id = it.get("batch_id")

                sale_item = SaleItem(
                    sale_id=sale.id,
                    batch_id=batch_id,
                    quantity=it.get("quantity", 0),
                    original_price=it.get("original_price", 0),
                    sale_price=it.get("sale_price", 0),
                    discount_percent=it.get("discount_percent", 0),
                    discount_amount=it.get("discount_amount", 0),
                    total=it.get("total", 0),
                )
                db.add(sale_item)

                # Server KassaStock dan sotilganini ayirish
                ks = db.query(KassaStock).filter(
                    KassaStock.batch_id == batch_id
                ).first()
                if ks:
                    ks.quantity = max(ks.quantity - it.get("quantity", 0), 0)
                    if ks.quantity == 0:
                        b = db.query(Batch).filter(Batch.id == batch_id).first()
                        if b:
                            complete_batch(db, b.product_id)

            db.commit()
            result["qabul"] += 1

        except Exception as e:
            db.rollback()
            result["xato"].append({"sync_uuid": uuid, "sabab": str(e)})

    return {
        "status": "ok",
        "qabul": result["qabul"],
        "dublikat": result["dublikat"],
        "xato": result["xato"],
    }

