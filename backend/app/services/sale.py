from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.sale import Sale, SaleItem
# from app.models.kassa_stock import KassaStock
from app.models.client import Client
from app.models.client_debt import ClientDebt
from app.models.users import User, RoleEnum
from app.models.batch import Batch

from app.schemas.sale import SaleCreateSchema

from app.services.batch import complete_batch, get_current_batch

from app.services.daily_stat import update_daily_stat
from app.services.sync_service import sync_or_queue
from app.models.kassa_stock import KassaStock
from app.models.warehouse_stock import WarehouseStock
from app.models.sale_return import SaleReturn



def create_sale(db: Session, data: SaleCreateSchema, current_user: User) -> Sale:

    print(f"[SALE] Yangi savdo: page={data.page_number} | Kassir: {current_user.username}")

    # 1. Summalarni avtomatik hisoblash

    calculated_subtotal = 0
    item_discount_total = 0
    for item in data.items:
        line = item.sale_price * item.quantity
        calculated_subtotal += line
        if item.discount_percent > 0:
            item_discount_total += line * item.discount_percent / 100
        else:
            item_discount_total += item.discount_amount

    # Mahsulot chegirmasidan keyingi summa (umumiy chegirma shundan hisoblanadi)
    after_item_discount = calculated_subtotal - item_discount_total

    # Umumiy (global) chegirma
    if data.discount_percent > 0:
        global_discount = after_item_discount * data.discount_percent / 100
    else:
        global_discount = data.discount_amount

    # Jami chegirma = mahsulot + umumiy
    total_discount = item_discount_total + global_discount

    # total_amount = chegirmasiz to'liq summa
    calculated_total = calculated_subtotal
    # final = to'lanadigan
    calculated_final = calculated_subtotal - total_discount
    calculated_debt = max(calculated_final - data.paid_amount, 0)


    print(f"[SALE] Hisoblandi: jami={calculated_total} | final={calculated_final} | qarz={calculated_debt}")

    # 2. Sale yaratish
    sale = Sale(
        page_number=data.page_number,
        kassir_id=current_user.id,
        client_id=data.client_id,
        total_amount=calculated_total,
        # discount_amount=data.discount_amount,
        discount_amount=total_discount,      # 500,000 (jami chegirma) ⬅️ SHU
        final_amount=calculated_final,
        paid_amount=data.paid_amount,
        naqd_amount=data.naqd_amount,  # ⬅️ YANGI
        karta_amount=data.karta_amount,
        debt_amount=calculated_debt,
        payment_type=data.payment_type,
        note=data.note
    )
    db.add(sale)
    db.flush()

    print(f"[SALE] Yaratildi: ID {sale.id}")

    # 3. Har mahsulot uchun SaleItem yaratish
    for item in data.items:

        kassa_stock = db.query(KassaStock).filter(
            KassaStock.batch_id == item.batch_id
        ).first()

        if not kassa_stock or kassa_stock.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Kassada yetarli mahsulot yo'q! batch_id={item.batch_id}"
            )

        kassa_stock.quantity -= item.quantity
        print(f"[SALE] Kassadan ayirildi: batch_id={item.batch_id} | {item.quantity} ta")

        if kassa_stock.quantity == 0:
            tugagan_batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
            if tugagan_batch:
                complete_batch(db, tugagan_batch.product_id)
                print(f"[SALE] Batch tugadi, keyingisi aktiv: product_id={tugagan_batch.product_id}")

        if item.discount_percent > 0:
            item_discount = item.sale_price * item.quantity * item.discount_percent / 100
        else:
            item_discount = item.discount_amount
        item_total = item.sale_price * item.quantity - item_discount

        sale_item = SaleItem(
            sale_id=sale.id,
            batch_id=item.batch_id,
            quantity=item.quantity,
            original_price=item.original_price,
            sale_price=item.sale_price,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            total=item_total
        )
        db.add(sale_item)

    pt = data.payment_type.value if hasattr(data.payment_type, 'value') else str(data.payment_type)
    stat_cash = data.naqd_amount if pt in ("naqd", "aralash") else 0
    stat_card = data.karta_amount if pt in ("karta", "aralash") else 0


    # 4. Qarz bo'lsa → ClientDebt yaratish
    if calculated_debt > 0 and data.client_id:
        client_debt = ClientDebt(
            client_id=data.client_id,
            sale_id=sale.id,
            total_amount=calculated_debt,
            paid_amount=0.0,
            debt_amount=calculated_debt,
            note=data.note
        )
        db.add(client_debt)

        client = db.query(Client).filter(Client.id == data.client_id).first()
        if client:
            client.jami_qarz += calculated_debt
            print(f"[SALE] Mijoz qarzi yangilandi: {client.full_name} | +{calculated_debt}")

        # stat_cash = 0
        # stat_card = 0
        # stat_mixed = 0
        # if data.payment_type == PaymentType.naqd:
        #     stat_cash = data.naqd_amount or data.paid_amount
        # elif data.payment_type == PaymentType.karta:
        #     stat_card = data.karta_amount or data.paid_amount
        # elif data.payment_type == PaymentType.aralash:
        #     stat_mixed = data.paid_amount
        # qarz — pul yo'q, faqat debt_amount

    # 5. Kunlik statistika yangilash
    update_daily_stat(
        db=db,
        total_sales=calculated_final,
        cash_amount=stat_cash,
        card_amount=stat_card,
        # mixed_amount=stat_mixed,
        debt_amount=calculated_debt,
        return_amount = 0
    )

    db.commit()

    # Joinedload bilan qayta yuklab olish
    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.batch).joinedload(Batch.product),
            joinedload(Sale.kassir),
            joinedload(Sale.client)
        )
        .filter(Sale.id == sale.id)
        .first()
    )

    # Sync — savdo serverga yuboriladi
    sync_or_queue(db, "sales", "create", {
        "exe_id": sale.id,
        "page_number": sale.page_number,
        "total_amount": sale.total_amount,
        "final_amount": sale.final_amount,
        "paid_amount": sale.paid_amount,
        "debt_amount": sale.debt_amount,
        "payment_type": sale.payment_type.value if hasattr(sale.payment_type, 'value') else str(sale.payment_type),
        "note": sale.note,
        "client_phone": sale.client.phone if sale.client else None,
        "kassir_username": sale.kassir.username if sale.kassir else None,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "items": [
            {
                "product_name": item.batch.product.name if item.batch and item.batch.product else "?",
                "quantity": item.quantity,
                "sale_price": item.sale_price,
                "total": item.total
            }
            for item in sale.items
        ]
    })

    print(f"[SALE] Muvaffaqiyatli: ID {sale.id} | Jami: {calculated_final}")

    return sale

def get_sales(db: Session, client_id: int = None, page: int = 1, page_size: int = 50, manba: str = None) -> dict:

    print(f"[SALE] Ro'yxat | Client: {client_id} | Page: {page} | Manba: {manba}")

    query = db.query(Sale).filter(Sale.is_active == True)

    if manba:
        query = query.filter(Sale.manba == manba)

    if client_id:
        query = query.filter(Sale.client_id == client_id)


    total = query.count()

    sales = (
        query
        .options(
            joinedload(Sale.items).joinedload(SaleItem.batch).joinedload(Batch.product),
            joinedload(Sale.kassir),
            joinedload(Sale.client)
        )
        .order_by(Sale.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    print(f"[SALE] Topildi: {total} ta jami | {len(sales)} ta shu sahifada")

    return {"total": total, "page": page, "page_size": page_size, "items": sales}



def search_sales(db: Session, query: str, page: int = 1, page_size: int = 20) -> dict:
    """
    Savdolarni qidirish: ID, mijoz ismi, telefon yoki mashina raqami bo'yicha.
    """
    from sqlalchemy import or_

    search = (query or "").strip()
    print(f"[SALE] Qidiruv: '{search}'")

    q = db.query(Sale).filter(Sale.is_active == True)

    if search:
        q = q.outerjoin(Client, Sale.client_id == Client.id)
        like = f"%{search}%"

        conditions = [
            Client.full_name.ilike(like),
            Client.phone.ilike(like),
            Client.car_number.ilike(like),
        ]
        if search.isdigit():
            conditions.append(Sale.id == int(search))

        q = q.filter(or_(*conditions))
    else:
        # Qidiruv bo'sh bo'lsa — hech narsa qaytarmaymiz (yoki hammasi)
        q = q.filter(Sale.id == None)  # bo'sh natija

    total = q.count()
    sales = (
        q.options(
            joinedload(Sale.items).joinedload(SaleItem.batch).joinedload(Batch.product),
            joinedload(Sale.kassir),
            joinedload(Sale.client)
        )
        .order_by(Sale.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    print(f"[SALE] Qidiruv topildi: {total} ta")
    return {"total": total, "page": page, "page_size": page_size, "items": sales}





def get_sale(db: Session, sale_id: int) -> Sale:

    print(f"[SALE] So'raldi: ID {sale_id}")

    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.batch).joinedload(Batch.product),
            joinedload(Sale.kassir),
            joinedload(Sale.client)
        )
        .filter(Sale.id == sale_id, Sale.is_active == True)
        .first()
    )

    if not sale:
        print(f"[SALE] Topilmadi: ID {sale_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savdo topilmadi!"
        )

    return sale





def round_to_thousands(value: float) -> float:
    return round(value / 1000) * 1000



def return_sale_item(
    db: Session,
    sale_id: int,
    sale_item_id: int,
    quantity: float = None,
    return_type: str = "naqd",       # naqd / karta / aralash / qarz
    naqd_amount: float = 0,
    karta_amount: float = 0,
    return_amount: float = 0,        # qo'lda kiritilgan summa (0 = default yaxlit hisob)
    current_user: User = None,       # qaytarishni kim qildi
) -> Sale:

    print(f"[SALE] Qaytarish: sale={sale_id} | item={sale_item_id} | qty={quantity} | usul={return_type}")

    sale = get_sale(db, sale_id)

    sale_item = db.query(SaleItem).filter(
        SaleItem.id == sale_item_id,
        SaleItem.sale_id == sale_id,
        SaleItem.is_active == True
    ).first()

    if not sale_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savdo mahsuloti topilmadi!")

        # ── Rol × manba mosligi: kassir faqat kassa, skladchi faqat ombor ──
    if current_user:
        role = current_user.role
        if role == RoleEnum.kassir and sale.manba != "kassa":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Kassir faqat kassa sotuvini qaytara oladi!"
            )
        if role == RoleEnum.skladchi and sale.manba != "ombor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Omborchi faqat ombor sotuvini qaytara oladi!"
            )
        # admin/superadmin — ikkalasini ham qaytara oladi (tekshiruv yo'q)



    # Nechta qaytariladi
    return_qty = quantity if quantity and quantity > 0 else sale_item.quantity
    if return_qty > sale_item.quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Qaytarish soni ko'p! Mavjud: {sale_item.quantity}")

    # Qaytarish summasi:
    #   default = (return_qty / quantity) × item summasi, 1000 ga yaxlit
    #   return_amount kiritilgan bo'lsa — o'sha (erkin, chegarasiz)
    # unit_price = sale_item.total / sale_item.quantity if sale_item.quantity else 0
    # default_amount = round_to_thousands(unit_price * return_qty)
    # qaytarish = return_amount if return_amount and return_amount > 0 else default_amount

    unit_price = sale_item.total / sale_item.quantity if sale_item.quantity else 0
    line_gross = unit_price * return_qty  # chegirmasiz ulush (shu mahsulotning umumiy chegirmagacha bo'lgan qiymati)

    # Umumiy (global) chegirma nisbatini saqlaymiz — hozirgi discount_amount/total_amount nisbati bo'yicha
    discount_ratio = (sale.discount_amount / sale.total_amount) if sale.total_amount else 0
    discount_portion = round_to_thousands(line_gross * discount_ratio)

    default_amount = round_to_thousands(line_gross - discount_portion)  # chegirma bilan haqiqiy qaytariladigan summa
    qaytarish = return_amount if return_amount and return_amount > 0 else default_amount


    print(f"[SALE] Qaytarish summasi: {qaytarish} (default={default_amount}, usul={return_type})")

    # 1. STOCK — hozirgi FAOL batchga qaytadi (eski batch tugagan bo'lishi mumkin)
    #    manba: kassa → KassaStock, ombor → WarehouseStock
    tugagan_batch = db.query(Batch).filter(Batch.id == sale_item.batch_id).first()
    product_id = tugagan_batch.product_id if tugagan_batch else None

    faol_batch = get_current_batch(db, product_id) if product_id else None
    if not faol_batch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu mahsulotning faol partiyasi yo'q! Avval kirim qiling, keyin qaytaring."
        )

    if sale.manba == "ombor":
        stock = db.query(WarehouseStock).filter(WarehouseStock.batch_id == faol_batch.id).first()
        if not stock:
            stock = WarehouseStock(batch_id=faol_batch.id, quantity=0)
            db.add(stock)
            db.flush()
    else:
        stock = db.query(KassaStock).filter(KassaStock.batch_id == faol_batch.id).first()
        if not stock:
            stock = KassaStock(batch_id=faol_batch.id, quantity=0)
            db.add(stock)
            db.flush()

    stock.quantity += int(return_qty)
    print(f"[SALE] Stock (+{int(return_qty)}) → {sale.manba} | faol batch={faol_batch.id} | endi: {stock.quantity}")



    # 2. Sale summasini yangilash
    # sale.final_amount = max((sale.final_amount or 0) - qaytarish, 0)
    # sale.total_amount = max((sale.total_amount or 0) - qaytarish, 0)
    # 2. Sale summasini yangilash — umumiy chegirmani ham proporsional kamaytiramiz
    sale.total_amount = max((sale.total_amount or 0) - line_gross, 0)
    sale.discount_amount = max((sale.discount_amount or 0) - discount_portion, 0)
    sale.final_amount = max((sale.final_amount or 0) - qaytarish, 0)




    # 3. Pul qayerdan kamayadi
    stat_cash = 0
    stat_card = 0
    stat_debt = 0
    ret_naqd = 0
    ret_karta = 0

    if return_type == "qarz":
        stat_debt = -qaytarish
        client_debt = db.query(ClientDebt).filter(ClientDebt.sale_id == sale_id).first()
        if client_debt:
            client_debt.debt_amount = max(client_debt.debt_amount - qaytarish, 0)
            client_debt.total_amount = max(client_debt.total_amount - qaytarish, 0)
        if sale.client_id:
            client = db.query(Client).filter(Client.id == sale.client_id).first()
            if client:
                client.jami_qarz = max(client.jami_qarz - qaytarish, 0)
                print(f"[SALE] Qarzdan qaytarildi: {client.full_name} | -{qaytarish}")
        sale.debt_amount = max(sale.debt_amount - qaytarish, 0)

    elif return_type == "karta":
        stat_card = -qaytarish
        ret_karta = qaytarish
        sale.karta_amount = max((sale.karta_amount or 0) - qaytarish, 0)

    elif return_type == "aralash":
        n = round_to_thousands(naqd_amount)
        k = qaytarish - n   # qolgani karta — yig'indi aniq mos
        stat_cash = -n
        stat_card = -k
        ret_naqd = n
        ret_karta = k
        sale.naqd_amount = max((sale.naqd_amount or 0) - n, 0)
        sale.karta_amount = max((sale.karta_amount or 0) - k, 0)

    else:  # naqd (default)
        stat_cash = -qaytarish
        ret_naqd = qaytarish
        sale.naqd_amount = max((sale.naqd_amount or 0) - qaytarish, 0)

    # paid_amount yangilash
    sale.paid_amount = (sale.naqd_amount or 0) + (sale.karta_amount or 0)

    # 4. Statistika
    update_daily_stat(
        db=db,
        total_sales=-qaytarish,
        cash_amount=stat_cash,
        card_amount=stat_card,
        debt_amount=stat_debt,
        return_amount=qaytarish
    )

    # 5. SaleItem — qisman yoki to'liq
    # sale_item.quantity -= int(return_qty)
    # sale_item.total = max((sale_item.total or 0) - qaytarish, 0)
    # 5. SaleItem — qisman yoki to'liq

    sale_item.quantity -= int(return_qty)
    sale_item.total = max((sale_item.total or 0) - line_gross, 0)


    if sale_item.quantity <= 0:
        sale_item.is_active = False
        print("[SALE] To'liq qaytarildi")
    else:
        print(f"[SALE] Qisman qaytarildi | qolgan: {sale_item.quantity}")

    # 6. QAYTARISH TARIXI — SaleReturn jadvaliga (sening modelingga mos)
    sale_return = SaleReturn(
        sale_id=sale.id,
        sale_item_id=sale_item.id,
        batch_id=sale_item.batch_id,
        client_id=sale.client_id,
        kassir_id=current_user.id if current_user else sale.kassir_id,
        quantity=int(return_qty),
        amount=qaytarish,
        return_type=return_type,
        naqd_amount=ret_naqd,
        karta_amount=ret_karta,
        manba=sale.manba,
        note=None,
    )
    db.add(sale_return)

    db.commit()

    sync_or_queue(db, "sales", "update", {
        "exe_id": sale.id,
        "final_amount": sale.final_amount,
        "returned_item_id": sale_item_id,
        "returned_qty": int(return_qty),
        "returned_amount": qaytarish,
        "return_type": return_type
    })

    sale = get_sale(db, sale_id)
    print(f"[SALE] Qaytarildi: {qaytarish} | usul={return_type} | manba={sale.manba} | Yangi jami: {sale.final_amount}")
    return sale





def create_ombor_sale(db: Session, data: SaleCreateSchema, current_user: User) -> Sale:
    """Omborchi sotuvi — WarehouseStock dan kamayadi, narx erkin, manba='ombor'"""

    print(f"[OMBOR_SALE] Yangi ombor savdo: Omborchi: {current_user.username}")

    # 1. Summalarni hisoblash (kassadek)
    calculated_subtotal = 0
    item_discount_total = 0
    for item in data.items:
        line = item.sale_price * item.quantity
        calculated_subtotal += line
        if item.discount_percent > 0:
            item_discount_total += line * item.discount_percent / 100
        else:
            item_discount_total += item.discount_amount

    after_item_discount = calculated_subtotal - item_discount_total

    if data.discount_percent > 0:
        global_discount = after_item_discount * data.discount_percent / 100
    else:
        global_discount = data.discount_amount

    total_discount = item_discount_total + global_discount
    calculated_total = calculated_subtotal
    calculated_final = calculated_subtotal - total_discount
    calculated_debt = max(calculated_final - data.paid_amount, 0)

    print(f"[OMBOR_SALE] Hisoblandi: jami={calculated_total} | final={calculated_final} | qarz={calculated_debt}")

    # 2. Sale yaratish (manba='ombor')
    sale = Sale(
        page_number=data.page_number,
        kassir_id=current_user.id,
        client_id=data.client_id,
        total_amount=calculated_total,
        discount_amount=total_discount,
        final_amount=calculated_final,
        paid_amount=data.paid_amount,
        naqd_amount=data.naqd_amount,
        karta_amount=data.karta_amount,
        debt_amount=calculated_debt,
        payment_type=data.payment_type,
        note=data.note,
        manba="ombor"        # ⬅️ OMBOR
    )
    db.add(sale)
    db.flush()

    print(f"[OMBOR_SALE] Yaratildi: ID {sale.id}")

    # 3. Har mahsulot — WAREHOUSE STOCK dan kamaytir
    for item in data.items:

        wh_stock = db.query(WarehouseStock).filter(
            WarehouseStock.batch_id == item.batch_id
        ).first()

        if not wh_stock or wh_stock.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Omborda yetarli mahsulot yo'q! batch_id={item.batch_id}"
            )

        wh_stock.quantity -= item.quantity
        print(f"[OMBOR_SALE] Ombordan ayirildi: batch_id={item.batch_id} | {item.quantity} ta")

        if wh_stock.quantity == 0:
            tugagan_batch = db.query(Batch).filter(Batch.id == item.batch_id).first()
            if tugagan_batch:
                complete_batch(db, tugagan_batch.product_id)
                print(f"[OMBOR_SALE] Batch tugadi: product_id={tugagan_batch.product_id}")


        if item.discount_percent > 0:
            item_discount = item.sale_price * item.quantity * item.discount_percent / 100
        else:
            item_discount = item.discount_amount
        item_total = item.sale_price * item.quantity - item_discount

        sale_item = SaleItem(
            sale_id=sale.id,
            batch_id=item.batch_id,
            quantity=item.quantity,
            original_price=item.original_price,
            sale_price=item.sale_price,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            total=item_total
        )
        db.add(sale_item)

    # 4. Qarz (mijoz) — kassadek
    if calculated_debt > 0 and data.client_id:
        client_debt = ClientDebt(
            client_id=data.client_id,
            sale_id=sale.id,
            total_amount=calculated_debt,
            paid_amount=0.0,
            debt_amount=calculated_debt,
            note=data.note
        )
        db.add(client_debt)

        client = db.query(Client).filter(Client.id == data.client_id).first()
        if client:
            client.jami_qarz += calculated_debt
            print(f"[OMBOR_SALE] Mijoz qarzi: {client.full_name} | +{calculated_debt}")

    # Statistika — HOZIRCHA tegilmaydi (ombor alohida, keyin qo'shamiz)

    db.commit()

    # Qayta yuklab olish
    sale = (
        db.query(Sale)
        .options(
            joinedload(Sale.items).joinedload(SaleItem.batch).joinedload(Batch.product),
            joinedload(Sale.kassir),
            joinedload(Sale.client)
        )
        .filter(Sale.id == sale.id)
        .first()
    )

    print(f"[OMBOR_SALE] Muvaffaqiyatli: ID {sale.id} | Jami: {calculated_final}")

    return sale

def get_sale_returns(
        db: Session,
        manba: str = None,
        sale_id: int = None,
        page: int = 1,
        page_size: int = 50,
) -> dict:

    print(f"[SALE] Qaytarishlar ro'yxati | Manba: {manba} | Sale: {sale_id} | Page: {page}")

    query = db.query(SaleReturn).filter(SaleReturn.is_active == True)

    if manba:
        query = query.filter(SaleReturn.manba == manba)

    if sale_id:
        query = query.filter(SaleReturn.sale_id == sale_id)



    total = query.count()

    returns = (
        query
        .options(
            joinedload(SaleReturn.kassir),
            joinedload(SaleReturn.client),
            joinedload(SaleReturn.batch).joinedload(Batch.product),
        )
        .order_by(SaleReturn.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    print(f"[SALE] Qaytarishlar topildi: {total} ta")

    return {"total": total, "page": page, "page_size": page_size, "items": returns}




