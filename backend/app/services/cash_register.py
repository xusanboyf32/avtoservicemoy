from sqlalchemy.orm import Session
from datetime import date
from app.models.cash_register import CashRegister


def get_or_create_register(db: Session) -> CashRegister:
    reg = db.query(CashRegister).first()
    if not reg:
        reg = CashRegister(
            kunlik_naqd=0.0, kunlik_karta=0.0,
            oylik_naqd=0.0, oylik_karta=0.0,
            last_date=date.today()
        )
        db.add(reg)
        db.flush()
        print(f"[CASH_REGISTER] Yangi yaratildi")
    return reg






def add_sale_amount(db: Session, naqd_amount: float = 0.0, karta_amount: float = 0.0):
    """
    Har bir haqiqiy naqd/karta harakati (sotuv, qaytarish -qiymatlarda ham) shu orqali o'tadi.
    Kunlik — kun almashsa 0dan boshlanadi.
    Oylik — 30 kundan oshsa, yig'ilgan-yig'ilmaganidan qat'iy nazar, avtomatik 0ga tushadi
    (buxgalter vaqtida yig'ib olmagan bo'lsa ham, vaqt o'tishi bilan hisob yangilanadi).
    """
    reg = get_or_create_register(db)
    today = date.today()

    if reg.last_date != today:
        # Yangi kun boshlandi — kunlik har doim 0dan boshlanadi
        reg.kunlik_naqd = 0.0
        reg.kunlik_karta = 0.0

        # Oylik — agar oxirgi yangilanishdan 30 kun yoki undan ko'p o'tgan bo'lsa, avtomatik nollanadi
        days_passed = (today - reg.last_date).days
        if days_passed >= 30:
            reg.oylik_naqd = 0.0
            reg.oylik_karta = 0.0
            print(f"[CASH_REGISTER] 30+ kun o'tdi ({days_passed} kun) — oylik avtomatik nollandi")

        reg.last_date = today
        print(f"[CASH_REGISTER] Yangi kun: {today} — kunlik nolladi")

    reg.kunlik_naqd += naqd_amount
    reg.kunlik_karta += karta_amount
    reg.oylik_naqd += naqd_amount
    reg.oylik_karta += karta_amount

    if reg.kunlik_naqd < 0: reg.kunlik_naqd = 0
    if reg.kunlik_karta < 0: reg.kunlik_karta = 0
    if reg.oylik_naqd < 0: reg.oylik_naqd = 0
    if reg.oylik_karta < 0: reg.oylik_karta = 0

    db.commit()
    db.refresh(reg)
    print(f"[CASH_REGISTER] +naqd={naqd_amount} +karta={karta_amount} | kunlik=({reg.kunlik_naqd},{reg.kunlik_karta}) oylik=({reg.oylik_naqd},{reg.oylik_karta})")
    return reg






def get_status(db: Session) -> CashRegister:
    return get_or_create_register(db)


def collect_cash(db: Session, current_user, note: str = None) -> dict:
    """
    Buxgalter/admin/superadmin — yig'ilmagan (oylik) summani Sefga kirim qilib o'tkazadi.
    Kunlik va oylik ikkalasi ham 0ga tushadi.
    """
    from app.services.safe_transaction import create_transaction
    from app.schemas.safe_transaction import SafeTransactionCreateSchema
    from app.models.safe_transaction import SafeDirection
    from fastapi import HTTPException, status

    reg = get_or_create_register(db)

    naqd = reg.oylik_naqd
    karta = reg.oylik_karta
    jami = naqd + karta

    if jami <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Yig'ib olinadigan pul yo'q!")

    tx = create_transaction(
        db,
        SafeTransactionCreateSchema(
            direction=SafeDirection.kirim,
            naqd_amount=naqd,
            karta_amount=karta,
            note=note or f"Kassadan yig'ildi ({current_user.username})",
            related_user_id=current_user.id
        ),
        current_user
    )

    reg.kunlik_naqd = 0.0
    reg.kunlik_karta = 0.0
    reg.oylik_naqd = 0.0
    reg.oylik_karta = 0.0
    db.commit()

    print(f"[CASH_REGISTER] Yig'ildi: naqd={naqd} karta={karta} | tx_id={tx.id}")

    return {
        "collected_naqd": naqd,
        "collected_karta": karta,
        "collected_total": jami,
        "safe_transaction_id": tx.id
    }

