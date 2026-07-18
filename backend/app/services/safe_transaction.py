from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from datetime import datetime, date
from app.models.safe_transaction import SafeTransaction, SafeDirection
from app.schemas.safe_transaction import SafeTransactionCreateSchema
from app.models.users import User


def create_transaction(db: Session, data: SafeTransactionCreateSchema, current_user: User) -> SafeTransaction:

    naqd = data.naqd_amount or 0.0
    karta = data.karta_amount or 0.0
    jami = naqd + karta

    print(f"[SAFE] Yangi tranzaksiya: {data.direction} | jami={jami} | naqd={naqd} | karta={karta}")

    if jami <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Summa 0 dan katta bo'lishi kerak!"
        )

    # Agar chiqim bo'lsa — balansdan ko'p chiqarib bo'lmaydi
    if data.direction == SafeDirection.chiqim:
        balance = get_balance(db)
        if naqd > balance["naqd_balans"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Naqd yetarli emas! Balansda: {balance['naqd_balans']:,.0f}"
            )
        if karta > balance["karta_balans"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Karta yetarli emas! Balansda: {balance['karta_balans']:,.0f}"
            )

    tx = SafeTransaction(
        direction=data.direction,
        amount=jami,
        naqd_amount=naqd,
        karta_amount=karta,
        note=data.note,
        related_kontragent_id=data.related_kontragent_id,
        related_user_id=data.related_user_id,
        created_by_id=current_user.id
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    print(f"[SAFE] Yaratildi: ID {tx.id}")

    return tx


def get_balance(db: Session) -> dict:
    """Joriy Sef balansi — barcha kirim - chiqim"""

    kirim_naqd = db.query(func.sum(SafeTransaction.naqd_amount)).filter(
        SafeTransaction.direction == SafeDirection.kirim
    ).scalar() or 0.0
    kirim_karta = db.query(func.sum(SafeTransaction.karta_amount)).filter(
        SafeTransaction.direction == SafeDirection.kirim
    ).scalar() or 0.0

    chiqim_naqd = db.query(func.sum(SafeTransaction.naqd_amount)).filter(
        SafeTransaction.direction == SafeDirection.chiqim
    ).scalar() or 0.0
    chiqim_karta = db.query(func.sum(SafeTransaction.karta_amount)).filter(
        SafeTransaction.direction == SafeDirection.chiqim
    ).scalar() or 0.0

    naqd_balans = kirim_naqd - chiqim_naqd
    karta_balans = kirim_karta - chiqim_karta

    return {
        "naqd_balans": naqd_balans,
        "karta_balans": karta_balans,
        "jami_balans": naqd_balans + karta_balans
    }

def get_transactions(
        db: Session,
        date_from: date = None,
        date_to: date = None,
        kontragent_id: int = None,
        related_user_id: int = None,
        note_search: str = None,
        direction: str = None,
        page: int = 1,
        page_size: int = 50
) -> dict:

    print(
        f"[SAFE] Ro'yxat so'raldi | {date_from} - {date_to} | kontragent={kontragent_id} | user={related_user_id} | note={note_search}")

    query = db.query(SafeTransaction)

    if date_from:
        query = query.filter(func.date(SafeTransaction.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(SafeTransaction.created_at) <= date_to)
    if kontragent_id:
        query = query.filter(SafeTransaction.related_kontragent_id == kontragent_id)
    if related_user_id:
        query = query.filter(SafeTransaction.related_user_id == related_user_id)
    if note_search:
        query = query.filter(SafeTransaction.note.ilike(f"%{note_search}%"))
    if direction:
        query = query.filter(SafeTransaction.direction == direction)



    total = query.count()

    items = query.order_by(SafeTransaction.id.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    print(f"[SAFE] Topildi: {total} ta")

    return {"total": total, "page": page, "page_size": page_size, "items": items}


def get_worker_expenses_summary(db: Session) -> list:
    """Xodimlar bo'yicha jami xarajat (maosh) hisobot"""

    results = db.query(
        SafeTransaction.related_user_id,
        func.sum(SafeTransaction.amount).label("jami")
    ).filter(
        SafeTransaction.direction == SafeDirection.chiqim,
        SafeTransaction.related_user_id.isnot(None)
    ).group_by(SafeTransaction.related_user_id).all()

    output = []
    for user_id, jami in results:
        user = db.query(User).filter(User.id == user_id).first()
        output.append({
            "user_id": user_id,
            "username": user.username if user else "—",
            "full_name": user.profile.full_name if user and user.profile else None,
            "jami_xarajat": jami
        })

    return output
