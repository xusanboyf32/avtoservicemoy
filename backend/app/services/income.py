from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from datetime import date
from app.models.income import Income, IncomeItem
from app.models.users import User, RoleEnum
from app.schemas.income import IncomeCreateSchema
from app.services.batch import create_batch
from app.services.payment import create_payment
from app.schemas.batch import BatchCreateSchema


def generate_income_number(db: Session) -> str:
    last_income = db.query(Income).order_by(Income.id.desc()).first()
    if not last_income:
        return "KR-0001"
    last_number = int(last_income.income_number.split("-")[1])
    return f"KR-{str(last_number + 1).zfill(4)}"


def create_income(db: Session, data: IncomeCreateSchema, current_user: User) -> Income:

    # Omborchi to'lov kirita olmaydi — avtomatik qarz qilinadi
    if current_user.role == RoleEnum.skladchi:
        data.payment_type = "qarz"
        data.naqd_amount = 0.0
        data.karta_amount = 0.0

    print(f"[INCOME] Yangi kirim: kontragent_id={data.kontragent_id} | Omborchi: {current_user.username}")

    income_number = generate_income_number(db)
    print(f"[INCOME] Raqam: {income_number}")

    income = Income(
        income_number=income_number,
        date=date.today(),
        warehouse_user_id=current_user.id,
        kontragent_id=data.kontragent_id,
        note=data.note
    )

    db.add(income)
    db.flush()

    print(f"[INCOME] Yaratildi: ID {income.id}")

    total_amount = 0.0

    for item in data.items:
        print(f"[INCOME] Mahsulot: product_id={item.product_id} | Soni: {item.quantity}")

        # Narx kiritilgan bo'lsa — batch yaratiladi
        # if item.price_usd and item.exchange_rate and item.markup_percent:
        if (item.price_usd is not None and item.price_usd > 0 and
                item.exchange_rate is not None and item.exchange_rate > 0 and
                item.markup_percent is not None):

            batch = create_batch(
                db=db,
                data=BatchCreateSchema(
                    product_id=item.product_id,
                    brand_id=item.brand_id,
                    quantity=item.quantity,
                    price_usd=item.price_usd,
                    exchange_rate=item.exchange_rate,
                    markup_percent=item.markup_percent
                ),
                income_id=income.id
            )
            price_som = item.price_usd * item.exchange_rate
            total_amount += item.quantity * price_som

            income_item = IncomeItem(
                income_id=income.id,
                batch_id=batch.id,
                product_id=item.product_id,
                brand_id=item.brand_id,
                quantity=item.quantity,
                price_usd=item.price_usd,
                exchange_rate=item.exchange_rate,
                price_som=price_som
            )



            print(f"[INCOME] Batch yaratildi: ID {batch.id} | Summa: {item.quantity * price_som:,.0f}")

        # Narx yo'q — admin keyinroq kiritadi
        else:
            income_item = IncomeItem(
                income_id=income.id,
                batch_id=None,
                product_id=item.product_id,
                brand_id=item.brand_id,
                quantity=item.quantity
            )
            print(f"[INCOME] Narx kutilmoqda: product_id={item.product_id}")

        db.add(income_item)

    print(f"[INCOME] Jami summa: {total_amount:,.0f}")

    create_payment(
        db=db,
        income=income,
        total_amount=total_amount,
        payment_type=data.payment_type,
        naqd_amount=data.naqd_amount,
        karta_amount=data.karta_amount
    )

    db.commit()

    income = db.query(Income).options(
        joinedload(Income.kontragent),
        joinedload(Income.warehouse_user),
        joinedload(Income.items),
        joinedload(Income.payment)
    ).filter(Income.id == income.id).first()

    print(f"[INCOME] Muvaffaqiyatli: {income.income_number} | {len(data.items)} ta mahsulot | Jami: {total_amount:,.0f}")

    return income


def get_incomes(db: Session, search: str = None, page: int = 1, page_size: int = 50) -> dict:

    print(f"[INCOME] Ro'yxat so'raldi | Search: {search} | Page: {page}")

    query = db.query(Income).filter(Income.is_active == True)

    if search:
        query = query.filter(Income.income_number.ilike(f"%{search}%"))

    total = query.count()

    incomes = query.options(
        joinedload(Income.kontragent),
        joinedload(Income.warehouse_user),
        joinedload(Income.items),
        joinedload(Income.payment)
    ).order_by(Income.id.desc()) \
     .offset((page - 1) * page_size) \
     .limit(page_size) \
     .all()

    print(f"[INCOME] Topildi: {total} ta jami | {len(incomes)} ta shu sahifada")

    return {"total": total, "page": page, "page_size": page_size, "items": incomes}


def get_income(db: Session, income_id: int) -> Income:

    print(f"[INCOME] So'raldi: ID {income_id}")

    income = db.query(Income).options(
        joinedload(Income.kontragent),
        joinedload(Income.warehouse_user),
        joinedload(Income.items),
        joinedload(Income.payment)
    ).filter(
        Income.id == income_id,
        Income.is_active == True
    ).first()

    if not income:
        print(f"[INCOME] Topilmadi: ID {income_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kirim topilmadi!"
        )

    return income





def delete_income(db: Session, income_id: int) -> dict:

    print(f"[INCOME] O'chirish: ID {income_id}")

    income = get_income(db, income_id)
    income.is_active = False
    db.commit()

    print(f"[INCOME] O'chirildi: {income.income_number}")

    return {"message": f"{income.income_number} o'chirildi!"}


def get_income_items_history(
    db: Session,
    product_id: int = None,
    kontragent_id: int = None,
    date_from=None,
    date_to=None,
    page: int = 1,
    page_size: int = 50
) -> dict:
    """
    Kirim tarixi — har bir mahsulotning qachon, qancha, qanday narxda kelganini
    ko'rsatuvchi batafsil ro'yxat. Filtrlar: mahsulot, kontragent, sana oralig'i.
    """
    from sqlalchemy import func
    from app.models.income import IncomeItem

    print(f"[INCOME] Tarix so'raldi | product={product_id} | kontragent={kontragent_id} | {date_from}-{date_to}")

    query = db.query(IncomeItem).join(Income, IncomeItem.income_id == Income.id).filter(
        IncomeItem.price_som.isnot(None)
    )

    if product_id:
        query = query.filter(IncomeItem.product_id == product_id)
    if kontragent_id:
        query = query.filter(Income.kontragent_id == kontragent_id)
    if date_from:
        query = query.filter(func.date(Income.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(Income.created_at) <= date_to)

    total = query.count()

    items = query.order_by(IncomeItem.created_at.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    print(f"[INCOME] Tarix topildi: {total} ta")

    return {"total": total, "page": page, "page_size": page_size, "items": items}

