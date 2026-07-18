from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.kontragent import Kontragent
from app.schemas.kontragent import KontragentCreateSchema, KontragentUpdateSchema
from app.models.income import Income
from app.models.payment import IncomePayment
from app.models.users import User


def create_kontragent(db: Session, data: KontragentCreateSchema) -> Kontragent:

    print(f"[KONTRAGENT] Yangi kontragent: {data.name}")

    # Nom band emasligini tekshirish
    existing = db.query(Kontragent).filter(
        Kontragent.name == data.name
    ).first()

    if existing:
        print(f"[KONTRAGENT] Allaqachon mavjud: {data.name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kontragent allaqachon mavjud!"
        )

    # Username band emasligini tekshirish
    from app.models.users import User, RoleEnum
    from app.core.security import hash_password
    from app.core.permissions import ROLE_DEFAULT_PERMISSIONS

    existing_user = db.query(User).filter(
        User.username == data.username
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu username allaqachon band!"
        )

    # 1. User yaratish
    user = User(
        username=data.username,
        password=hash_password(data.password),
        role=RoleEnum.kontragent
    )
    db.add(user)
    db.flush()

    # 2. Permission yaratish
    from app.models.users import Permission
    default_perms = ROLE_DEFAULT_PERMISSIONS.get(RoleEnum.kontragent, {})
    permission = Permission(
        user_id=user.id,
        **default_perms
    )
    db.add(permission)

    # 3. Kontragent yaratish va userga bog'lash
    kontragent = Kontragent(
        name=data.name,
        phone=data.phone,
        user_id=user.id
    )
    db.add(kontragent)
    db.commit()
    db.refresh(kontragent)

    print(f"[KONTRAGENT] Yaratildi: {kontragent.name} | User: {data.username}")

    return kontragent



def get_kontragents(db: Session) -> list:

    print(f"[KONTRAGENT] Ro'yxat so'raldi")

    kontragents = db.query(Kontragent).filter(
        Kontragent.is_active == True
    ).all()

    print(f"[KONTRAGENT] Topildi: {len(kontragents)} ta")

    return kontragents


def get_kontragent(db: Session, kontragent_id: int) -> Kontragent:

    print(f"[KONTRAGENT] So'raldi: ID {kontragent_id}")

    kontragent = db.query(Kontragent).filter(
        Kontragent.id == kontragent_id,
        Kontragent.is_active == True
    ).first()

    if not kontragent:
        print(f"[KONTRAGENT] Topilmadi: ID {kontragent_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kontragent topilmadi!"
        )

    return kontragent


def update_kontragent(db: Session, kontragent_id: int, data: KontragentUpdateSchema) -> Kontragent:

    print(f"[KONTRAGENT] Yangilash: ID {kontragent_id}")

    kontragent = get_kontragent(db, kontragent_id)

    if data.name:
        kontragent.name = data.name
    if data.phone:
        kontragent.phone = data.phone
    if data.user_id:
        kontragent.user_id = data.user_id


    db.commit()
    db.refresh(kontragent)

    print(f"[KONTRAGENT] Yangilandi: {kontragent.name}")

    return kontragent


def delete_kontragent(db: Session, kontragent_id: int) -> dict:

    print(f"[KONTRAGENT] O'chirish: ID {kontragent_id}")

    kontragent = get_kontragent(db, kontragent_id)
    kontragent.is_active = False
    db.commit()

    print(f"[KONTRAGENT] O'chirildi: {kontragent.name}")

    return {"message": f"{kontragent.name} o'chirildi!"}





def get_my_incomes(db: Session, current_user: User) -> list:
    """Kontragent o'z kirimlarini ko'radi"""

    print(f"[KONTRAGENT] O'z kirimlar: user_id={current_user.id}")

    # Kontragentni topish
    kontragent = db.query(Kontragent).filter(
        Kontragent.user_id == current_user.id
    ).first()

    if not kontragent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kontragent topilmadi!"
        )

    # Kirimlar
    incomes = db.query(Income).filter(
        Income.kontragent_id == kontragent.id,
        Income.is_active == True
    ).order_by(Income.id.desc()).all()

    print(f"[KONTRAGENT] Topildi: {len(incomes)} ta kirim")

    return incomes


def get_my_debts(db: Session, current_user: User) -> list:
    """Kontragent o'z qarzlarini ko'radi"""

    print(f"[KONTRAGENT] O'z qarzlar: user_id={current_user.id}")

    # Kontragentni topish
    kontragent = db.query(Kontragent).filter(
        Kontragent.user_id == current_user.id
    ).first()

    if not kontragent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kontragent topilmadi!"
        )

    # Qarzlar
    debts = db.query(IncomePayment).filter(
        IncomePayment.income_id.in_(
            db.query(Income.id).filter(
                Income.kontragent_id == kontragent.id
            )
        ),
        IncomePayment.is_paid == False
    ).all()

    print(f"[KONTRAGENT] Topildi: {len(debts)} ta qarz")

    return debts




def pay_kontragent(
    db: Session,
    kontragent_id: int,
    naqd_amount: float = 0.0,
    karta_amount: float = 0.0,
    payment_type: str = "naqd",
    note: str = None,
    current_user=None
) -> dict:
    """
    Admin kontragentga pul beradi → jami qarz kamayadi.
    To'lov tarixga yoziladi (statistika uchun) va Admin Sefidan CHIQIM sifatida yoziladi.
    """
    from app.models.kontragent_payment import KontragentPayment
    from app.services.safe_transaction import create_transaction
    from app.schemas.safe_transaction import SafeTransactionCreateSchema
    from app.models.safe_transaction import SafeDirection

    print(f"[KONTRAGENT] To'lov: kontragent_id={kontragent_id} | naqd={naqd_amount} | karta={karta_amount}")

    kontragent = get_kontragent(db, kontragent_id)

    naqd = naqd_amount or 0.0
    karta = karta_amount or 0.0
    jami_tolov = naqd + karta

    if jami_tolov <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To'lov summasi 0 dan katta bo'lishi kerak!"
        )

    # Qarzdan ko'p to'lab bo'lmaydi
    joriy_qarz = kontragent.jami_qarz or 0.0
    if jami_tolov > joriy_qarz:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"To'lov ({jami_tolov:,.0f}) qarzdan ({joriy_qarz:,.0f}) ko'p!"
        )

    # Qarzni kamaytir
    kontragent.jami_qarz = joriy_qarz - jami_tolov

    # To'lovni tarixga yoz
    payment = KontragentPayment(
        kontragent_id=kontragent_id,
        total_amount=jami_tolov,
        naqd_amount=naqd,
        karta_amount=karta,
        payment_type=payment_type,
        note=note
    )
    db.add(payment)

    # Admin Sefidan CHIQIM — kontragentga pul chiqdi
    if current_user:
        create_transaction(
            db,
            SafeTransactionCreateSchema(
                direction=SafeDirection.chiqim,
                naqd_amount=naqd,
                karta_amount=karta,
                note=note or f"Kontragentga to'lov: {kontragent.name}",
                related_kontragent_id=kontragent_id
            ),
            current_user
        )

    db.commit()
    db.refresh(kontragent)

    print(f"[KONTRAGENT] To'lov qilindi: -{jami_tolov:,.0f} | Qolgan qarz: {kontragent.jami_qarz:,.0f}")

    return {
        "ok": True,
        "kontragent_id": kontragent_id,
        "tolangan": jami_tolov,
        "qolgan_qarz": kontragent.jami_qarz
    }






def get_kontragent_payments(db: Session, kontragent_id: int) -> list:
    """Kontragentning to'lov tarixi"""
    from app.models.kontragent_payment import KontragentPayment

    print(f"[KONTRAGENT] To'lov tarixi: kontragent_id={kontragent_id}")

    payments = db.query(KontragentPayment).filter(
        KontragentPayment.kontragent_id == kontragent_id
    ).order_by(KontragentPayment.id.desc()).all()

    return payments



def get_my_payments(db: Session, user_id: int) -> list:
    """Kontragent o'z to'lov tarixini ko'radi (login qilgan user orqali)"""
    from app.models.kontragent_payment import KontragentPayment

    kontragent = db.query(Kontragent).filter(
        Kontragent.user_id == user_id
    ).first()

    if not kontragent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kontragent topilmadi!"
        )

    payments = db.query(KontragentPayment).filter(
        KontragentPayment.kontragent_id == kontragent.id
    ).order_by(KontragentPayment.id.desc()).all()

    return payments




