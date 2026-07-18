from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.client_debt import ClientDebt, ClientDebtPayment
from app.models.client import Client
from app.schemas.client_debt import ClientDebtPaymentCreateSchema
from app.services.daily_stat import update_daily_stat


def get_client_debts(db: Session, client_id: int) -> dict:

    print(f"[CLIENT_DEBT] Qarzlar: client_id={client_id}")

    client = db.query(Client).filter(
        Client.id == client_id,
        Client.is_active == True
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mijoz topilmadi!"
        )

    debts = db.query(ClientDebt).filter(
        ClientDebt.client_id == client_id,
        ClientDebt.is_active == True
    ).order_by(ClientDebt.id.desc()).all()

    payments = db.query(ClientDebtPayment).filter(
        ClientDebtPayment.client_id == client_id,
        ClientDebtPayment.is_active == True
    ).order_by(ClientDebtPayment.id.desc()).all()

    print(f"[CLIENT_DEBT] Topildi: {len(debts)} ta qarz")

    return {
        "client": client,
        "jami_qarz": client.jami_qarz,
        "qarzlar": debts,
        "tolovlar": payments
    }


def get_all_debts(db: Session) -> list:

    print(f"[CLIENT_DEBT] Barcha qarzlar")

    debts = db.query(ClientDebt).filter(
        ClientDebt.is_paid == False,
        ClientDebt.is_active == True
    ).order_by(ClientDebt.id.desc()).all()

    print(f"[CLIENT_DEBT] Topildi: {len(debts)} ta")

    return debts


def pay_client_debt(
    db: Session,
    debt_id: int,
    data: ClientDebtPaymentCreateSchema
) -> ClientDebt:

    print(f"[CLIENT_DEBT] To'lov: debt_id={debt_id} | Summa: {data.amount}")

    debt = db.query(ClientDebt).filter(
        ClientDebt.id == debt_id,
        ClientDebt.is_active == True
    ).first()

    if not debt:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Qarz topilmadi!"
        )

    if debt.is_paid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu qarz allaqachon to'langan!"
        )

    if data.amount > debt.debt_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"To'lov summasi qarzdan ko'p! Qarz: {debt.debt_amount}"
        )

    # To'lov yaratish
    payment = ClientDebtPayment(
        debt_id=debt_id,
        client_id=debt.client_id,
        amount=data.amount,
        payment_type=data.payment_type,
        note=data.note
    )
    db.add(payment)

    # Qarz yangilash
    debt.paid_amount += data.amount
    debt.debt_amount -= data.amount

    if debt.debt_amount <= 0:
        debt.is_paid = True
        print(f"[CLIENT_DEBT] To'liq to'landi: debt_id={debt_id}")

    # Mijoz jami qarzini yangilash
    client = db.query(Client).filter(
        Client.id == debt.client_id
    ).first()

    if client:
        client.jami_qarz -= data.amount
        if client.jami_qarz < 0:
            client.jami_qarz = 0
        print(f"[CLIENT_DEBT] Mijoz qarzi kamaydi: {client.full_name} | -{data.amount}")



    # Kunlik statistika yangilash
    # update_daily_stat(
    #     db=db,
    #     total_sales=0,
    #     cash_amount=data.amount,
    #     debt_amount=-data.amount
    # )



    # # Kunlik statistika yangilash — to'lov turiga qarab to'g'ri ustunga yoziladi
    # pt = data.payment_type.value if hasattr(data.payment_type, 'value') else str(data.payment_type)
    # stat_cash = data.amount if pt in ("naqd", "aralash") else 0
    # stat_card = data.amount if pt == "karta" else 0
    #
    # update_daily_stat(
    #     db=db,
    #     total_sales=0,
    #     cash_amount=stat_cash,
    #     card_amount=stat_card,
    #     debt_amount=-data.amount
    # )

    # Kunlik statistika yangilash — to'lov turiga qarab to'g'ri ustunga yoziladi
    pt = data.payment_type.value if hasattr(data.payment_type, 'value') else str(data.payment_type)

    if pt == "naqd":
        stat_cash = data.amount
        stat_card = 0
    elif pt == "karta":
        stat_cash = 0
        stat_card = data.amount
    else:  # aralash
        stat_cash = data.naqd_amount or 0
        stat_card = data.karta_amount or 0
        # Ehtiyot chorasi: agar ikkalasi ham 0/berilmagan bo'lsa, hammasini naqd deb hisoblaymiz
        if stat_cash == 0 and stat_card == 0:
            stat_cash = data.amount

    update_daily_stat(
        db=db,
        total_sales=0,
        cash_amount=stat_cash,
        card_amount=stat_card,
        debt_amount=-data.amount
    )


    db.commit()
    db.refresh(debt)

    print(f"[CLIENT_DEBT] Muvaffaqiyatli: debt_id={debt_id} | Qoldi: {debt.debt_amount}")

    return debt

#
# print(f"[CLIENT_DEBT] Muvaffaqiyatli: debt_id={debt_id} | Qoldi: {debt.debt_amount}")
#
#     return debt


def pay_client_total_debt(db: Session, client_id: int, data) -> dict:
    """
    Mijozning UMUMIY qarziga to'lov qabul qilish.
    Eng eski (birinchi yaratilgan) qarzdan boshlab, ketma-ket to'liq yopib, keyingisiga o'tadi (FIFO).
    """

    print(f"[CLIENT_DEBT] Umumiy to'lov: client_id={client_id} | Summa: {data.amount}")

    client = db.query(Client).filter(
        Client.id == client_id,
        Client.is_active == True
    ).first()

    if not client:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mijoz topilmadi!")

    debts = db.query(ClientDebt).filter(
        ClientDebt.client_id == client_id,
        ClientDebt.is_paid == False,
        ClientDebt.is_active == True
    ).order_by(ClientDebt.id.asc()).all()   # eng eskisi birinchi

    total_debt = sum(d.debt_amount for d in debts)

    if data.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Summa 0 dan katta bo'lishi kerak!")
    if data.amount > total_debt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"To'lov summasi umumiy qarzdan ko'p! Qarz: {total_debt}"
        )

    remaining = data.amount
    affected = []

    for debt in debts:
        if remaining <= 0:
            break
        pay_amt = min(remaining, debt.debt_amount)

        payment = ClientDebtPayment(
            debt_id=debt.id,
            client_id=client_id,
            amount=pay_amt,
            payment_type=data.payment_type,
            note=data.note
        )
        db.add(payment)

        debt.paid_amount += pay_amt
        debt.debt_amount -= pay_amt
        if debt.debt_amount <= 0:
            debt.is_paid = True

        remaining -= pay_amt
        affected.append({"debt_id": debt.id, "sale_id": debt.sale_id, "paid": pay_amt})
        print(f"[CLIENT_DEBT]   debt_id={debt.id} | -{pay_amt} | qoldi={debt.debt_amount}")

    client.jami_qarz -= data.amount
    if client.jami_qarz < 0:
        client.jami_qarz = 0

    # Kunlik statistika — to'lov turiga qarab
    pt = data.payment_type.value if hasattr(data.payment_type, 'value') else str(data.payment_type)
    if pt == "naqd":
        stat_cash, stat_card = data.amount, 0
    elif pt == "karta":
        stat_cash, stat_card = 0, data.amount
    else:  # aralash
        stat_cash = data.naqd_amount or 0
        stat_card = data.karta_amount or 0
        if stat_cash == 0 and stat_card == 0:
            stat_cash = data.amount

    update_daily_stat(
        db=db,
        total_sales=0,
        cash_amount=stat_cash,
        card_amount=stat_card,
        debt_amount=-data.amount
    )

    db.commit()

    print(f"[CLIENT_DEBT] Umumiy to'lov yakunlandi: {client.full_name} | -{data.amount} | qoldi={client.jami_qarz}")

    return {
        "client_id": client_id,
        "paid_total": data.amount,
        "remaining_debt": client.jami_qarz,
        "affected_debts": affected
    }

