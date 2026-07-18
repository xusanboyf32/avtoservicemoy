from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from app.models.batch import Batch, BatchStatus
from app.schemas.batch import BatchCreateSchema


def round_to_thousands(price: float) -> float:
    """
    Narxni 1000 ga yaxlitlash:
    500 va yuqori → yuqoriga
    499 va past → pastga
    """
    remainder = price % 1000
    if remainder >= 500:
        return price - remainder + 1000
    else:
        return price - remainder


def calculate_prices(
    price_usd: float,
    exchange_rate: float,
    markup_percent: float,
    quantity: int
) -> dict:
    """Barcha narxlarni avtomatik hisoblaydi"""

    price_som = price_usd * exchange_rate
    markup_sum = price_som * markup_percent / 100
    sale_price_raw = price_som + markup_sum
    sale_price = round_to_thousands(sale_price_raw)
    total_usd = quantity * price_usd
    total_som = total_usd * exchange_rate

    return {
        "price_som": price_som,
        "markup_sum": markup_sum,
        "sale_price_raw": sale_price_raw,
        "sale_price": sale_price,
        "total_usd": total_usd,
        "total_som": total_som,
    }


def get_current_batch(db: Session, product_id: int) -> Batch:
    """Mahsulotning joriy aktiv partiyasini qaytaradi"""

    return db.query(Batch).filter(
        Batch.product_id == product_id,
        Batch.is_current == True,
        Batch.is_active == True
    ).first()



# ================================================
def create_batch(
    db: Session,
    data: BatchCreateSchema,
    income_id: int
) -> Batch:

    print(f"[BATCH] Yangi partiya: product_id={data.product_id}")

    from app.models.warehouse_stock import WarehouseStock
    from app.models.kassa_stock import KassaStock

    prices = calculate_prices(
        price_usd=data.price_usd,
        exchange_rate=data.exchange_rate,
        markup_percent=data.markup_percent,
        quantity=data.quantity
    )
    print(f"[BATCH] Hisoblandi: sotuv={prices['sale_price']}")

    # Navbatning barcha aktiv partiyalari, eskidan yangiga (FIFO tartib)
    # index 0 = current (hozir sotilayotgan), oxirgisi = navbat tail (eng oxirgi kelgan)
    queue = db.query(Batch).filter(
        Batch.product_id == data.product_id,
        Batch.is_active == True
    ).order_by(Batch.created_at.asc()).all()

    if not queue:
        print(f"[BATCH] Birinchi partiya")
        batch = Batch(
            income_id=income_id,
            product_id=data.product_id,
            brand_id=data.brand_id,
            quantity=data.quantity,
            price_usd=data.price_usd,
            exchange_rate=data.exchange_rate,
            markup_percent=data.markup_percent,
            is_current=True,
            is_active=True,
            status=BatchStatus.aktiv,
            **prices
        )
        db.add(batch)
        db.flush()
        ws = WarehouseStock(batch_id=batch.id, quantity=data.quantity)
        db.add(ws)
        print(f"[BATCH] WarehouseStock yaratildi: {data.quantity} ta")
        print(f"[BATCH] Birinchi partiya yaratildi: ID {batch.id}")
        return batch

    last_batch = queue[-1]

    if prices["sale_price"] < last_batch.sale_price:
        print(f"[BATCH] Narx past (navbat oxiridan) -> yangi navbatga qo'shiladi")
        batch = Batch(
            income_id=income_id,
            product_id=data.product_id,
            brand_id=data.brand_id,
            quantity=data.quantity,
            price_usd=data.price_usd,
            exchange_rate=data.exchange_rate,
            markup_percent=data.markup_percent,
            is_current=False,
            is_active=True,
            status=BatchStatus.kutmoqda,
            **prices
        )
        db.add(batch)
        db.flush()
        ws = WarehouseStock(batch_id=batch.id, quantity=data.quantity)
        db.add(ws)
        print(f"[BATCH] WarehouseStock yaratildi: {data.quantity} ta")
        print(f"[BATCH] Kutmoqda: ID {batch.id}")
        return batch

    # Narx >= navbat oxiridagi narx -> birlashtirish, kaskad tarzda orqaga (current tomon) qaraymiz
    new_price = prices["sale_price"]
    merge_list = []
    i = len(queue) - 1
    while i >= 0 and new_price >= queue[i].sale_price:
        merge_list.append(queue[i])
        i -= 1
    merge_list.reverse()

    print(f"[BATCH] Narx >= navbat oxiridan -> {len(merge_list)} ta partiya bilan birlashadi")

    real_ombor = 0
    real_kassa = 0
    for b in merge_list:
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == b.id).first()
        ks = db.query(KassaStock).filter(KassaStock.batch_id == b.id).first()
        if ws:
            real_ombor += ws.quantity
            ws.quantity = 0
        if ks:
            real_kassa += ks.quantity
            ks.quantity = 0
        b.is_current = False
        b.is_active = False
        b.status = BatchStatus.tugagan

    yangi_ombor = real_ombor + data.quantity
    total_quantity = yangi_ombor + real_kassa

    becomes_current = merge_list[0].id == queue[0].id

    print(
        f"[BATCH] ombor: {real_ombor} + yangi {data.quantity} = {yangi_ombor} | "
        f"kassa: {real_kassa} | jami: {total_quantity} | current bo'ladimi: {becomes_current}"
    )

    batch = Batch(
        income_id=income_id,
        product_id=data.product_id,
        brand_id=data.brand_id,
        quantity=total_quantity,
        price_usd=data.price_usd,
        exchange_rate=data.exchange_rate,
        markup_percent=data.markup_percent,
        is_current=becomes_current,
        is_active=True,
        status=BatchStatus.aktiv if becomes_current else BatchStatus.kutmoqda,
        **prices
    )
    db.add(batch)
    db.flush()

    ws_new = WarehouseStock(batch_id=batch.id, quantity=yangi_ombor)
    db.add(ws_new)

    if real_kassa > 0:
        ks_new = KassaStock(batch_id=batch.id, quantity=real_kassa)
        db.add(ks_new)

    print(f"[BATCH] Yangi batch {batch.id}: ombor={yangi_ombor}, kassa={real_kassa}, narx={prices['sale_price']}")

    return batch
# ==================================================




#
# def create_batch(
#     db: Session,
#     data: BatchCreateSchema,
#     income_id: int
# ) -> Batch:
#
#     print(f"[BATCH] Yangi partiya: product_id={data.product_id}")
#
#     # Narxlarni hisoblash
#     prices = calculate_prices(
#         price_usd=data.price_usd,
#         exchange_rate=data.exchange_rate,
#         markup_percent=data.markup_percent,
#         quantity=data.quantity
#     )
#
#     print(f"[BATCH] Hisoblandi: sotuv={prices['sale_price']}")
#
#     # Joriy aktiv batch topiladi
#     current = get_current_batch(db, data.product_id)
#
#     if not current:
#         # Birinchi partiya
#         print(f"[BATCH] Birinchi partiya")
#         batch = Batch(
#             income_id=income_id,
#             product_id=data.product_id,
#             brand_id=data.brand_id,
#             quantity=data.quantity,
#             price_usd=data.price_usd,
#             exchange_rate=data.exchange_rate,
#             markup_percent=data.markup_percent,
#             is_current=True,
#             is_active=True,
#             status=BatchStatus.aktiv,
#             **prices
#         )
#         db.add(batch)
#         db.flush()
#         # QO'SHILADI:
#         from app.models.warehouse_stock import WarehouseStock
#         ws = WarehouseStock(batch_id=batch.id, quantity=data.quantity)
#         db.add(ws)
#         print(f"[BATCH] WarehouseStock yaratildi: {data.quantity} ta")
#         print(f"[BATCH] Birinchi partiya yaratildi: ID {batch.id}")
#
#
#
#
#
#     elif prices["sale_price"] > current.sale_price:
#         print(f"[BATCH] Narx yuqori → hammasi birlashadi (real qolgan bilan)")
#
#         from app.models.warehouse_stock import WarehouseStock
#         from app.models.kassa_stock import KassaStock
#
#         # Shu mahsulotning barcha aktiv batchlari (faol + navbat)
#         old_batches = db.query(Batch).filter(
#             Batch.product_id == data.product_id,
#             Batch.is_active == True
#         ).all()
#
#         # Real qolgan sonlarni yig'amiz (asl batch.quantity EMAS)
#         ombor_qoldi = 0  # WarehouseStock yig'indisi
#         kassa_qoldi = 0  # KassaStock yig'indisi
#
#         for b in old_batches:
#             ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == b.id).first()
#             ks = db.query(KassaStock).filter(KassaStock.batch_id == b.id).first()
#
#             if ws:
#                 ombor_qoldi += ws.quantity
#                 ws.quantity = 0  # eski ombor stock tozalanadi
#             if ks:
#                 kassa_qoldi += ks.quantity
#                 ks.quantity = 0  # eski kassa stock tozalanadi
#
#             # Eski batch tugagan bo'ladi
#             b.is_current = False
#             b.is_active = False
#             b.status = BatchStatus.tugagan
#
#         # Yangi kelgan ombor stockga qo'shiladi (kirim doim omborga tushadi)
#         yangi_ombor = ombor_qoldi + data.quantity
#         # Jami (hisob uchun): ombor + kassa qolgan
#         total_quantity = yangi_ombor + kassa_qoldi
#
#         print(
#             f"[BATCH] Real qolgan → ombor: {ombor_qoldi} + yangi {data.quantity} = {yangi_ombor} | kassa: {kassa_qoldi} | jami: {total_quantity}")
#
#         batch = Batch(
#             income_id=income_id,
#             product_id=data.product_id,
#             brand_id=data.brand_id,
#             quantity=total_quantity,
#             price_usd=data.price_usd,
#             exchange_rate=data.exchange_rate,
#             markup_percent=data.markup_percent,
#             is_current=True,
#             is_active=True,
#             status=BatchStatus.aktiv,
#             **prices
#         )
#         db.add(batch)
#         db.flush()
#
#         # Ombor stock — ombor qolgan + yangi kelgan
#         ws_new = WarehouseStock(batch_id=batch.id, quantity=yangi_ombor)
#         db.add(ws_new)
#
#         # Kassa stock — faqat kassa qolgan bo'lsa yaratiladi (alohida, yangi narxda)
#         if kassa_qoldi > 0:
#             ks_new = KassaStock(batch_id=batch.id, quantity=kassa_qoldi)
#             db.add(ks_new)
#
#         print(f"[BATCH] Yangi batch {batch.id}: ombor={yangi_ombor}, kassa={kassa_qoldi}, narx={prices['sale_price']}")
#
#
#
#
#
#     elif prices["sale_price"] == current.sale_price:
#         # Narx TENG → real qolgan bilan birlashadi (narx o'zgarmaydi)
#         print(f"[BATCH] Narx teng → real qolgan bilan birlashadi")
#
#         from app.models.warehouse_stock import WarehouseStock
#         from app.models.kassa_stock import KassaStock
#
#         # Shu mahsulotning barcha aktiv batchlari (faol + navbat)
#         old_batches = db.query(Batch).filter(
#             Batch.product_id == data.product_id,
#             Batch.is_active == True
#         ).all()
#
#         # Real qolgan sonlar (asl batch.quantity EMAS)
#         ombor_qoldi = 0
#         kassa_qoldi = 0
#
#         for b in old_batches:
#             ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == b.id).first()
#             ks = db.query(KassaStock).filter(KassaStock.batch_id == b.id).first()
#
#             if ws:
#                 ombor_qoldi += ws.quantity
#                 ws.quantity = 0
#             if ks:
#                 kassa_qoldi += ks.quantity
#                 ks.quantity = 0
#
#             b.is_current = False
#             b.is_active = False
#             b.status = BatchStatus.tugagan
#
#         # Yangi kelgan omborga tushadi
#         yangi_ombor = ombor_qoldi + data.quantity
#         total_quantity = yangi_ombor + kassa_qoldi
#
#         print(
#             f"[BATCH] Real qolgan → ombor: {ombor_qoldi} + yangi {data.quantity} = {yangi_ombor} | kassa: {kassa_qoldi} | jami: {total_quantity}")
#
#         batch = Batch(
#             income_id=income_id,
#             product_id=data.product_id,
#             brand_id=data.brand_id,
#             quantity=total_quantity,
#             price_usd=data.price_usd,
#             exchange_rate=data.exchange_rate,
#             markup_percent=data.markup_percent,
#             is_current=True,
#             is_active=True,
#             status=BatchStatus.aktiv,
#             **prices
#         )
#         db.add(batch)
#         db.flush()
#
#         # Ombor stock
#         ws_new = WarehouseStock(batch_id=batch.id, quantity=yangi_ombor)
#         db.add(ws_new)
#
#         # Kassa stock — qolgan bo'lsa ko'chadi
#         if kassa_qoldi > 0:
#             ks_new = KassaStock(batch_id=batch.id, quantity=kassa_qoldi)
#             db.add(ks_new)
#
#         print(
#             f"[BATCH] Teng birlashdi: batch {batch.id} | ombor={yangi_ombor}, kassa={kassa_qoldi}, narx={prices['sale_price']}")
#
#
#
#
#
#     else:
#         # Yangi narx PAST
#         # Joriy avval tugaydi, yangi kutadi
#         print(f"[BATCH] Narx past → yangi kutmoqda")
#         batch = Batch(
#             income_id=income_id,
#             product_id=data.product_id,
#             brand_id=data.brand_id,
#             quantity=data.quantity,
#             price_usd=data.price_usd,
#             exchange_rate=data.exchange_rate,
#             markup_percent=data.markup_percent,
#             is_current=False,
#             is_active=True,
#             status=BatchStatus.kutmoqda,
#             **prices
#         )
#         db.add(batch)
#         db.flush()
#         # QO'SHILADI:
#         from app.models.warehouse_stock import WarehouseStock
#         ws = WarehouseStock(batch_id=batch.id, quantity=data.quantity)
#         db.add(ws)
#         print(f"[BATCH] WarehouseStock yaratildi: {data.quantity} ta")
#         print(f"[BATCH] Kutmoqda: ID {batch.id}")
#
#     return batch


def complete_batch(db: Session, product_id: int):
    """
    Joriy batch tugadi (quantity=0):
    → Keyingi kutayotgan batch aktiv bo'ladi
    """
    print(f"[BATCH] Batch tugadi: product_id={product_id}")

    current = db.query(Batch).filter(
        Batch.product_id == product_id,
        Batch.is_current == True
    ).first()

    if current:
        current.is_current = False
        current.is_active = False
        current.status = BatchStatus.tugagan
        print(f"[BATCH] Tugadi: ID {current.id}")


    # Keyingi kutayotgan batch
    next_batch = db.query(Batch).filter(
        Batch.product_id == product_id,
        Batch.is_current == False,
        Batch.is_active == True,
        Batch.status == BatchStatus.kutmoqda
    ).order_by(Batch.created_at.asc()).first()


    # next_batch = db.query(Batch).filter(
    #     Batch.product_id == product_id,
    #     Batch.is_current == False,
    #     Batch.is_active == True,
    #     Batch.status == BatchStatus.kutmoqda
    # ).order_by(Batch.created_at.asc()).first()

    if next_batch:
        next_batch.is_current = True
        next_batch.status = BatchStatus.aktiv
        print(f"[BATCH] Yangi aktiv: ID {next_batch.id}")

    db.commit()



def get_product_stock(db: Session, product_id: int) -> dict:
    """
    Mahsulot umumiy holati:
    → Joriy soni (KASSADAGI real son), narxi
    → Keyingi soni, narxi
    → 6 oylik min/max narx
    """
    from app.models.kassa_stock import KassaStock

    print(f"[BATCH] Stock so'raldi: product_id={product_id}")

    # Joriy aktiv batch
    current = get_current_batch(db, product_id)

    # Kassadagi real son (savdo qilinganda kamayadi)
    kassa_soni = 0
    if current:
        ks = db.query(KassaStock).filter(KassaStock.batch_id == current.id).first()
        kassa_soni = ks.quantity if ks else 0

        # Keyingi kutayotgan batchlar (BARCHASI)
        waiting_batches = db.query(Batch).filter(
            Batch.product_id == product_id,
            Batch.is_current == False,
            Batch.is_active == True,
            Batch.status == BatchStatus.kutmoqda
        ).order_by(Batch.created_at.asc()).all()  # eski birinchi (FIFO)

        # Keyingi jami soni (barcha kutayotgan yig'indisi)
        keyingi_jami_soni = sum(b.quantity for b in waiting_batches)

        # Keyingi narx — navbatdagi (eng eski kutayotgan) batchning narxi
        next_batch = waiting_batches[0] if waiting_batches else None



    # Keyingi kutayotgan batch
    # next_batch = db.query(Batch).filter(
    #     Batch.product_id == product_id,
    #     Batch.is_current == False,
    #     Batch.is_active == True,
    #     Batch.status == BatchStatus.kutmoqda
    # ).order_by(Batch.created_at.desc()).first()

    # 6 oylik min/max narx
    six_months_ago = datetime.now() - timedelta(days=180)

    min_narx = db.query(func.min(Batch.sale_price)).filter(
        Batch.product_id == product_id,
        Batch.created_at >= six_months_ago
    ).scalar()

    max_narx = db.query(func.max(Batch.sale_price)).filter(
        Batch.product_id == product_id,
        Batch.created_at >= six_months_ago
    ).scalar()

    return {
        "batch_id": current.id if current else None,
        "joriy_soni": kassa_soni,
        "joriy_narx": current.sale_price if current else 0,

        "keyingi_soni": keyingi_jami_soni if keyingi_jami_soni > 0 else None,
        "keyingi_narx": next_batch.sale_price if next_batch else None,

        "min_narx_6oy": min_narx,
        "max_narx_6oy": max_narx,
    }



#
# def get_product_stock(db: Session, product_id: int) -> dict:
#     """
#     Mahsulot umumiy holati:
#     → Joriy soni, narxi
#     → Keyingi soni, narxi
#     → 6 oylik min/max narx
#     """
#     print(f"[BATCH] Stock so'raldi: product_id={product_id}")
#
#     # Joriy aktiv batch
#     current = get_current_batch(db, product_id)
#
#     # Keyingi kutayotgan batch
#     next_batch = db.query(Batch).filter(
#         Batch.product_id == product_id,
#         Batch.is_current == False,
#         Batch.is_active == True,
#         Batch.status == BatchStatus.kutmoqda
#     ).order_by(Batch.created_at.desc()).first()
#
#     # 6 oylik min/max narx
#     six_months_ago = datetime.now() - timedelta(days=180)
#
#     min_narx = db.query(func.min(Batch.sale_price)).filter(
#         Batch.product_id == product_id,
#         Batch.created_at >= six_months_ago
#     ).scalar()
#
#     max_narx = db.query(func.max(Batch.sale_price)).filter(
#         Batch.product_id == product_id,
#         Batch.created_at >= six_months_ago
#     ).scalar()
#
#     return {
#         "batch_id": current.id if current else None,
#         "joriy_soni": current.quantity if current else 0,
#         "joriy_narx": current.sale_price if current else 0,
#         "keyingi_soni": next_batch.quantity if next_batch else None,
#         "keyingi_narx": next_batch.sale_price if next_batch else None,
#         "min_narx_6oy": min_narx,
#         "max_narx_6oy": max_narx,
#     }
#

def get_all_stock(db: Session) -> list:
    """Barcha mahsulotlar joriy holati"""

    print(f"[BATCH] Barcha stock so'raldi")

    # Barcha aktiv mahsulotlar
    current_batches = db.query(Batch).filter(
        Batch.is_current == True,
        Batch.is_active == True
    ).all()

    result = []
    for batch in current_batches:
        stock = get_product_stock(db, batch.product_id)
        stock["product_id"] = batch.product_id
        stock["product_name"] = batch.product.name
        stock["product_barcode"] = batch.product.barcode
        result.append(stock)
    # result = []
    # for batch in current_batches:
    #     stock = get_product_stock(db, batch.product_id)
    #     stock["product"] = batch.product
    #     result.append(stock)

    print(f"[BATCH] Topildi: {len(result)} ta mahsulot")

    return result




def get_product_batches(db: Session, product_id: int) -> list:
    """Mahsulotning barcha partiyalari (tarix) — admin ko'radi"""
    from app.models.batch import Batch

    print(f"[BATCH] Partiya tarixi: product_id={product_id}")

    batches = db.query(Batch).filter(
        Batch.product_id == product_id
    ).order_by(Batch.created_at.desc()).all()

    result = []
    for b in batches:
        result.append({
            "id": b.id,
            "income_id": b.income_id,
            "income_number": b.income.income_number if b.income else None,
            "date": b.income.date.isoformat() if b.income and b.income.date else None,
            "quantity": b.quantity,
            "price_usd": b.price_usd,
            "exchange_rate": b.exchange_rate,
            "markup_percent": b.markup_percent,
            "price_som": b.price_som,          # tan narx
            "sale_price": b.sale_price,        # sotuv narx
            "total_som": b.total_som,          # jami (soni × tan narx)
            "status": b.status.value if hasattr(b.status, 'value') else str(b.status),
            "is_current": b.is_current,
            "is_active": b.is_active,
        })

    print(f"[BATCH] Topildi: {len(result)} ta partiya")
    return result






def get_warehouse_stock(db: Session) -> list:
    """Ombor qoldig'i — warehouse_stocks asosida (omborchi sotuvi uchun)"""
    from app.models.warehouse_stock import WarehouseStock

    print("[BATCH] Ombor qoldig'i so'raldi")

    rows = (
        db.query(WarehouseStock)
        .filter(WarehouseStock.quantity > 0)
        .all()
    )

    result = []
    for ws in rows:
        batch = ws.batch
        if not batch or not batch.is_active:
            continue

        # Kontragent — partiya qaysi kirimdan, kirim qaysi kontragentdan
        kontragent_nomi = None
        if batch.income and batch.income.kontragent:
            kontragent_nomi = batch.income.kontragent.name

        result.append({
            "batch_id": batch.id,
            "product_id": batch.product_id,
            "product_name": batch.product.name if batch.product else "—",
            "product_barcode": batch.product.barcode if batch.product else "",
            "joriy_soni": ws.quantity,
            "kontragent": kontragent_nomi,
            "kelgan_sana": ws.created_at.isoformat() if ws.created_at else None,
        })

    print(f"[BATCH] Ombor: {len(result)} ta mahsulot")
    return result







def get_kassa_stock_view(db: Session) -> list:
    """
    Kassa uchun stock ko'rinishi:
    HAR BIR aktiv partiya (joriy VA navbatdagi) alohida qator sifatida qaytariladi —
    shunda omborchi navbatdagi partiyani ham oldindan kassaga jo'nata oladi,
    current tugashini kutmasdan.
    """
    from app.models.warehouse_stock import WarehouseStock
    from app.models.kassa_stock import KassaStock

    print("[BATCH] Kassa uchun stock so'raldi (barcha aktiv partiyalar)")

    # Barcha aktiv partiyalar (current + kutmoqda), mahsulot bo'yicha, FIFO tartibida
    batches = db.query(Batch).filter(
        Batch.is_active == True
    ).order_by(Batch.product_id.asc(), Batch.created_at.asc()).all()

    result = []
    for batch in batches:
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == batch.id).first()
        ombor_soni = ws.quantity if ws else 0

        ks = db.query(KassaStock).filter(KassaStock.batch_id == batch.id).first()
        kassa_soni = ks.quantity if ks else 0

        result.append({
            "batch_id": batch.id,
            "product_id": batch.product_id,
            "product_name": batch.product.name if batch.product else "—",
            "product_barcode": batch.product.barcode if batch.product else "—",
            "ombor_soni": ombor_soni,          # shu partiyaning ombordagi qoldig'i
            "kassa_soni": kassa_soni,          # shu partiyaning kassadagi qoldig'i
            "sotuv_narx": batch.sale_price,    # shu partiyaning narxi
            "is_current": batch.is_current,    # hozir aktiv sotilyaptimi
            "status": batch.status.value if hasattr(batch.status, 'value') else str(batch.status),
        })

    print(f"[BATCH] Kassa uchun stock: {len(result)} ta partiya")
    return result

