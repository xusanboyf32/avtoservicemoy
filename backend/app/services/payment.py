from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.payment import IncomePayment, PaymentTypeEnum
from app.models.income import Income
from app.schemas.payment import IncomePaymentUpdateSchema


def create_payment(
    db: Session,
    income: Income,
    total_amount: float,
    payment_type: PaymentTypeEnum,
    naqd_amount: float = 0.0,
    karta_amount: float = 0.0
) -> IncomePayment:

    print(f"[PAYMENT] Yangi to'lov: income_id={income.id} | Jami: {total_amount}")

    # To'langan summa
    paid_amount = naqd_amount + karta_amount

    # Qarz qoldig'i
    debt_amount = total_amount - paid_amount

    # To'liq to'landimi
    is_paid = debt_amount <= 0

    payment = IncomePayment(
        income_id=income.id,
        total_amount=total_amount,
        naqd_amount=naqd_amount,
        karta_amount=karta_amount,
        debt_amount=max(debt_amount, 0),
        is_paid=is_paid,
        payment_type=payment_type
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    print(f"[PAYMENT] Yaratildi: qarz={payment.debt_amount} | to'landi={is_paid}")

    return payment


def update_payment(
    db: Session,
    income_id: int,
    data: IncomePaymentUpdateSchema
) -> IncomePayment:

    print(f"[PAYMENT] Yangilash: income_id={income_id}")

    # Mavjud to'lovni topish
    payment = db.query(IncomePayment).filter(
        IncomePayment.income_id == income_id
    ).first()

    if not payment:
        print(f"[PAYMENT] Topilmadi: income_id={income_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="To'lov topilmadi!"
        )

    if payment.is_paid:
        print(f"[PAYMENT] Allaqachon to'langan: income_id={income_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kirim allaqachon to'liq to'langan!"
        )

    # Yangi to'lovlarni qo'shish
    payment.naqd_amount += data.naqd_amount
    payment.karta_amount += data.karta_amount
    payment.payment_type = data.payment_type

    # Qarz qoldig'ini yangilash
    paid_amount = payment.naqd_amount + payment.karta_amount
    payment.debt_amount = max(payment.total_amount - paid_amount, 0)

    # To'liq to'landimi
    payment.is_paid = payment.debt_amount <= 0

    db.commit()
    db.refresh(payment)

    print(f"[PAYMENT] Yangilandi: qarz={payment.debt_amount} | to'landi={payment.is_paid}")

    return payment


def get_payment(db: Session, income_id: int) -> IncomePayment:

    print(f"[PAYMENT] So'raldi: income_id={income_id}")

    payment = db.query(IncomePayment).filter(
        IncomePayment.income_id == income_id
    ).first()

    if not payment:
        print(f"[PAYMENT] Topilmadi: income_id={income_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="To'lov topilmadi!"
        )

    return payment


def get_debts(db: Session) -> list:
    """Barcha qarzli kirimlar ro'yxati"""

    print(f"[PAYMENT] Qarzlar ro'yxati so'raldi")

    payments = db.query(IncomePayment).filter(
        IncomePayment.is_paid == False
    ).all()

    print(f"[PAYMENT] Topildi: {len(payments)} ta qarz")

    return payments
