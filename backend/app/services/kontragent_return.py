from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.kontragent_return import KontragentReturn, KontragentReturnItem
from app.models.batch import Batch
from app.models.income import Income
from app.models.kontragent import Kontragent
from app.schemas.kontragent_return import KontragentReturnCreateSchema, KontragentReturnPaySchema
from app.models.users import User





def round_to_thousands(value: float) -> float:
    """Yaxlitlash: 500 va yuqori bo'lsa yuqoriga, 499 va past bo'lsa pastga"""
    remainder = value % 1000
    if remainder >= 500:
        return value - remainder + 1000
    return value - remainder


def create_kontragent_return(
    db: Session,
    data: KontragentReturnCreateSchema,
    current_user: User
) -> KontragentReturn:
    """
    Kontragentga mahsulot qaytarish.
    LIFO: eng oxirgi (yangi) kelgan IncomeItem'dan boshlab, orqaga qarab taqsimlanadi.
    Narx — IncomeItem'ning ASL narxi (price_som), Batch keyinchalik birlashib ketgan bo'lsa ham o'zgarmaydi.
    Real OMBOR STOCK (WarehouseStock, batch orqali) dan kamaytiriladi — mahsulot jismonan qaytadi.
    """
    from app.models.warehouse_stock import WarehouseStock
    from app.models.income import IncomeItem

    print(f"[KONTRAGENT_RETURN] Yangi qaytarish: kontragent_id={data.kontragent_id} | product_id={data.product_id} | qty={data.quantity}")

    kontragent = db.query(Kontragent).filter(
        Kontragent.id == data.kontragent_id,
        Kontragent.is_active == True
    ).first()
    if not kontragent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontragent topilmadi!")

    if data.quantity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Miqdor 0 dan katta bo'lishi kerak!")

    # Shu kontragentdan, shu mahsulot bo'yicha kelgan barcha IncomeItem'lar — eng yangisi birinchi (LIFO)
    # Faqat narxi kiritilgan (price_som bor) va batchga bog'langan itemlar
    income_items = db.query(IncomeItem).join(Income, IncomeItem.income_id == Income.id).filter(
        Income.kontragent_id == data.kontragent_id,
        IncomeItem.product_id == data.product_id,
        IncomeItem.price_som.isnot(None),
        IncomeItem.batch_id.isnot(None)
    ).order_by(IncomeItem.created_at.desc()).all()

    if not income_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kontragentdan bu mahsulot bo'yicha narxi kiritilgan kirim topilmadi!"
        )

    from app.models.kassa_stock import KassaStock

    remaining = data.quantity
    total_amount = 0.0
    items_to_create = []
    stock_updates = []  # (stock obyekti, kamaytiriladigan miqdor)

    for it in income_items:
        if remaining <= 0:
            break

        # Real qoldiq — avval ombor, keyin kassa (shu itemning batchi orqali)
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == it.batch_id).first()
        ks = db.query(KassaStock).filter(KassaStock.batch_id == it.batch_id).first()
        ombor_qty = ws.quantity if ws else 0
        kassa_qty = ks.quantity if ks else 0
        available = ombor_qty + kassa_qty

        # Shu IncomeItem miqdoridan ko'p olib bo'lmaydi
        item_cap = min(it.quantity or 0, available)

        if item_cap <= 0:
            continue

        take = min(remaining, item_cap)
        amount = round_to_thousands(take * it.price_som)

        items_to_create.append({
            "batch_id": it.batch_id,
            "quantity": take,
            "unit_price": it.price_som,
            "amount": amount
        })

        # Avval ombordan, keyin kassadan kamaytiramiz
        from_ombor = min(take, ombor_qty)
        from_kassa = take - from_ombor
        if from_ombor > 0 and ws:
            stock_updates.append((ws, from_ombor))
        if from_kassa > 0 and ks:
            stock_updates.append((ks, from_kassa))

        total_amount += amount
        remaining -= take

        print(
            f"[KONTRAGENT_RETURN]   income_item {it.id} (batch {it.batch_id}): {take} ta x {it.price_som:,.0f} = {amount:,.0f} (ombor:-{from_ombor}, kassa:-{from_kassa})")

    if remaining > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ombor+kassada yetarli mahsulot yo'q! Qaytarib bo'lmaydigan qoldiq: {remaining} ta"
        )

    # Agar admin narxni qo'lda kiritgan bo'lsa — shuni ishlatamiz, aks holda avtomatik hisoblangan
    if data.override_total_amount is not None and data.override_total_amount > 0:
        total_amount = round_to_thousands(data.override_total_amount)
    else:
        total_amount = round_to_thousands(total_amount)




    kontragent_return = KontragentReturn(
        kontragent_id=data.kontragent_id,
        product_id=data.product_id,
        quantity=data.quantity,
        total_amount=total_amount,
        paid_amount=0.0,
        debt_amount=total_amount,
        is_paid=False,
        note=data.note,
        created_by_id=current_user.id
    )
    db.add(kontragent_return)
    db.flush()   # id olish uchun

    for it in items_to_create:
        item = KontragentReturnItem(
            kontragent_return_id=kontragent_return.id,
            batch_id=it["batch_id"],
            quantity=it["quantity"],
            unit_price=it["unit_price"],
            amount=it["amount"]
        )
        db.add(item)

    # Real stockdan kamaytirish (ombor va/yoki kassa) — mahsulot jismonan qaytdi
    for stock_obj, take in stock_updates:
        stock_obj.quantity -= take

    # Kontragentning bizga qarzi ortadi
    kontragent.menga_qarzi = round_to_thousands((kontragent.menga_qarzi or 0.0) + total_amount)

    db.commit()
    db.refresh(kontragent_return)

    print(f"[KONTRAGENT_RETURN] Yaratildi: ID {kontragent_return.id} | Jami: {total_amount:,.0f}")

    return kontragent_return


def get_kontragent_returns(db: Session, kontragent_id: int = None) -> list:
    query = db.query(KontragentReturn)
    if kontragent_id:
        query = query.filter(KontragentReturn.kontragent_id == kontragent_id)
    return query.order_by(KontragentReturn.id.desc()).all()


def pay_kontragent_return_debt(
        db: Session,
        kontragent_id: int,
        data: KontragentReturnPaySchema,
        current_user: User
) -> dict:
    """
    Kontragent bizga qarzini to'laydi.
    Eng eski (birinchi yaratilgan) qaytarishdan boshlab, ketma-ket to'liq yopib, keyingisiga o'tadi (FIFO).
    Sefga KIRIM yoziladi.
    """
    from app.services.safe_transaction import create_transaction
    from app.schemas.safe_transaction import SafeTransactionCreateSchema
    from app.models.safe_transaction import SafeDirection

    print(f"[KONTRAGENT_RETURN] To'lov: kontragent_id={kontragent_id} | Summa: {data.amount}")

    kontragent = db.query(Kontragent).filter(
        Kontragent.id == kontragent_id,
        Kontragent.is_active == True
    ).first()
    if not kontragent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kontragent topilmadi!")

    returns = db.query(KontragentReturn).filter(
        KontragentReturn.kontragent_id == kontragent_id,
        KontragentReturn.is_paid == False
    ).order_by(KontragentReturn.id.asc()).all()

    total_debt = sum(r.debt_amount for r in returns)

    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Summa 0 dan katta bo'lishi kerak!")
    if data.amount > total_debt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"To'lov summasi qarzdan ko'p! Qarz: {total_debt:,.0f}"
        )

    remaining = data.amount
    affected = []

    for r in returns:
        if remaining <= 0:
            break
        pay_amt = min(remaining, r.debt_amount)

        r.paid_amount += pay_amt
        r.debt_amount -= pay_amt
        if r.debt_amount <= 0:
            r.is_paid = True

        remaining -= pay_amt
        affected.append({"return_id": r.id, "paid": pay_amt})
        print(f"[KONTRAGENT_RETURN]   return_id={r.id} | -{pay_amt:,.0f} | qoldi={r.debt_amount:,.0f}")

    kontragent.menga_qarzi = max((kontragent.menga_qarzi or 0.0) - data.amount, 0.0)

    # Sefga KIRIM — kontragent bizga to'ladi
    create_transaction(
        db,
        SafeTransactionCreateSchema(
            direction=SafeDirection.kirim,
            naqd_amount=data.naqd_amount,
            karta_amount=data.karta_amount,
            note=data.note or f"Kontragentdan qaytarish to'lovi: {kontragent.name}",
            related_kontragent_id=kontragent_id
        ),
        current_user
    )

    db.commit()

    print(f"[KONTRAGENT_RETURN] To'lov yakunlandi: -{data.amount:,.0f} | Qolgan: {kontragent.menga_qarzi:,.0f}")

    return {
        "kontragent_id": kontragent_id,
        "paid_total": data.amount,
        "remaining_debt": kontragent.menga_qarzi,
        "affected_returns": affected
    }
