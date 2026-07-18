from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from app.models.sale import Sale, SaleItem
from app.models.batch import Batch
from app.models.product import Product
from app.models.users import User
from app.models.safe_transaction import SafeTransaction, SafeDirection
from app.models.kontragent import Kontragent
from app.models.kontragent_payment import KontragentPayment
from app.models.income import Income


def _apply_date_filter(query, model_date_field, date_from: date, date_to: date):
    if date_from:
        query = query.filter(func.date(model_date_field) >= date_from)
    if date_to:
        query = query.filter(func.date(model_date_field) <= date_to)
    return query


def get_overview(db: Session, date_from: date = None, date_to: date = None) -> dict:
    """Umumiy ko'rsatkichlar — tanlangan davr uchun"""

    print(f"[STATS] Overview so'raldi: {date_from} - {date_to}")

    sales_q = db.query(Sale).filter(Sale.is_active == True)
    sales_q = _apply_date_filter(sales_q, Sale.created_at, date_from, date_to)

    total_sales = sales_q.with_entities(func.sum(Sale.final_amount)).scalar() or 0.0
    naqd_amount = sales_q.with_entities(func.sum(Sale.naqd_amount)).scalar() or 0.0
    karta_amount = sales_q.with_entities(func.sum(Sale.karta_amount)).scalar() or 0.0
    debt_amount = sales_q.with_entities(func.sum(Sale.debt_amount)).scalar() or 0.0
    sales_count = sales_q.count()

    # Qaytarilgan — SaleReturn orqali
    from app.models.sale_return import SaleReturn
    returns_q = db.query(SaleReturn).filter(SaleReturn.is_active == True)
    returns_q = _apply_date_filter(returns_q, SaleReturn.created_at, date_from, date_to)
    return_amount = returns_q.with_entities(func.sum(SaleReturn.amount)).scalar() or 0.0

    # Sef harakati
    safe_kirim_q = db.query(SafeTransaction).filter(SafeTransaction.direction == SafeDirection.kirim)
    safe_kirim_q = _apply_date_filter(safe_kirim_q, SafeTransaction.created_at, date_from, date_to)
    safe_kirim = safe_kirim_q.with_entities(func.sum(SafeTransaction.amount)).scalar() or 0.0

    safe_chiqim_q = db.query(SafeTransaction).filter(SafeTransaction.direction == SafeDirection.chiqim)
    safe_chiqim_q = _apply_date_filter(safe_chiqim_q, SafeTransaction.created_at, date_from, date_to)
    safe_chiqim = safe_chiqim_q.with_entities(func.sum(SafeTransaction.amount)).scalar() or 0.0

    # Sof xarajat — faqat haqiqiy xarajatlar (ehson, maosh, svet va h.k.),
    # kontragentga to'lov (mahsulot tannarxi) va boshqa pul ko'chirishlar HISOBGA OLINMAYDI
    pure_expense_q = db.query(SafeTransaction).filter(
        SafeTransaction.direction == SafeDirection.chiqim,
        SafeTransaction.related_kontragent_id.is_(None)
    )
    pure_expense_q = _apply_date_filter(pure_expense_q, SafeTransaction.created_at, date_from, date_to)
    pure_expense = pure_expense_q.with_entities(func.sum(SafeTransaction.amount)).scalar() or 0.0

    net_profit = total_sales - return_amount - pure_expense

    result = {
        "total_sales": total_sales,
        "naqd_amount": naqd_amount,
        "karta_amount": karta_amount,
        "debt_amount": debt_amount,
        "return_amount": return_amount,
        "safe_kirim": safe_kirim,
        "safe_chiqim": pure_expense,  # endi faqat "sof" xarajat ko'rsatiladi
        "net_profit": net_profit,
        "sales_count": sales_count,
    }





    print(f"[STATS] Overview: {result}")
    return result


def get_daily_trend(db: Session, date_from: date, date_to: date) -> list:
    """Har kunlik savdo trendi — grafik uchun"""

    print(f"[STATS] Daily trend: {date_from} - {date_to}")

    rows = db.query(
        func.date(Sale.created_at).label("day"),
        func.sum(Sale.final_amount).label("total"),
        func.sum(Sale.naqd_amount).label("naqd"),
        func.sum(Sale.karta_amount).label("karta"),
    ).filter(
        Sale.is_active == True,
        func.date(Sale.created_at) >= date_from,
        func.date(Sale.created_at) <= date_to
    ).group_by(func.date(Sale.created_at)).order_by(func.date(Sale.created_at).asc()).all()

    result = [
        {"date": r.day, "total_sales": r.total or 0.0, "naqd_amount": r.naqd or 0.0, "karta_amount": r.karta or 0.0}
        for r in rows
    ]
    print(f"[STATS] Daily trend: {len(result)} kun")
    return result


def get_top_products(db: Session, date_from: date = None, date_to: date = None, limit: int = 10) -> list:
    """Eng ko'p sotilgan mahsulotlar"""

    print(f"[STATS] Top products so'raldi")

    query = db.query(
        Product.id.label("product_id"),
        Product.name.label("product_name"),
        func.sum(SaleItem.quantity).label("total_quantity"),
        func.sum(SaleItem.total).label("total_amount"),
    ).join(Batch, SaleItem.batch_id == Batch.id) \
     .join(Product, Batch.product_id == Product.id) \
     .join(Sale, SaleItem.sale_id == Sale.id) \
     .filter(SaleItem.is_active == True, Sale.is_active == True)

    query = _apply_date_filter(query, Sale.created_at, date_from, date_to)

    rows = query.group_by(Product.id, Product.name) \
        .order_by(func.sum(SaleItem.total).desc()) \
        .limit(limit).all()

    result = [
        {"product_id": r.product_id, "product_name": r.product_name, "total_quantity": r.total_quantity or 0, "total_amount": r.total_amount or 0.0}
        for r in rows
    ]
    print(f"[STATS] Top products: {len(result)} ta")
    return result


def get_cashier_stats(db: Session, date_from: date = None, date_to: date = None) -> list:
    """Kassirlar bo'yicha statistika"""

    print(f"[STATS] Cashier stats so'raldi")

    query = db.query(
        User.id.label("kassir_id"),
        User.username.label("username"),
        func.sum(Sale.final_amount).label("total_sales"),
        func.count(Sale.id).label("sales_count"),
        func.sum(Sale.naqd_amount).label("naqd_amount"),
        func.sum(Sale.karta_amount).label("karta_amount"),
    ).join(Sale, Sale.kassir_id == User.id).filter(Sale.is_active == True)

    query = _apply_date_filter(query, Sale.created_at, date_from, date_to)

    rows = query.group_by(User.id, User.username).order_by(func.sum(Sale.final_amount).desc()).all()

    result = []
    for r in rows:
        user = db.query(User).filter(User.id == r.kassir_id).first()
        result.append({
            "kassir_id": r.kassir_id,
            "username": r.username,
            "full_name": user.profile.full_name if user and user.profile else None,
            "total_sales": r.total_sales or 0.0,
            "sales_count": r.sales_count or 0,
            "naqd_amount": r.naqd_amount or 0.0,
            "karta_amount": r.karta_amount or 0.0,
        })
    print(f"[STATS] Cashier stats: {len(result)} ta kassir")
    return result


def get_kontragent_stats(db: Session) -> list:
    """Kontragentlar bo'yicha umumiy holat (real vaqtli, sana filtri yo'q — joriy holat)"""

    print(f"[STATS] Kontragent stats so'raldi")

    kontragents = db.query(Kontragent).filter(Kontragent.is_active == True).all()

    result = []
    for k in kontragents:
        from app.models.payment import IncomePayment


        jami_kirim_real = db.query(func.sum(IncomePayment.total_amount)).join(
            Income, IncomePayment.income_id == Income.id
        ).filter(Income.kontragent_id == k.id).scalar() or 0.0

        jami_tolangan = db.query(func.sum(KontragentPayment.total_amount)).filter(
            KontragentPayment.kontragent_id == k.id
        ).scalar() or 0.0

        result.append({
            "kontragent_id": k.id,
            "name": k.name,
            "jami_kirim": jami_kirim_real,
            "jami_tolangan": jami_tolangan,
            "jami_qarz": k.jami_qarz or 0.0,
        })

    print(f"[STATS] Kontragent stats: {len(result)} ta")
    return result


def get_expense_breakdown(db: Session, date_from: date = None, date_to: date = None) -> list:
    """Xarajatlar — note bo'yicha guruhlangan (taxminiy kategoriya)"""

    print(f"[STATS] Expense breakdown so'raldi")

    query = db.query(SafeTransaction).filter(SafeTransaction.direction == SafeDirection.chiqim)
    query = _apply_date_filter(query, SafeTransaction.created_at, date_from, date_to)

    rows = query.all()

    groups = {}
    for r in rows:
        key = (r.note or "Boshqa").strip()
        if key not in groups:
            groups[key] = {"note_prefix": key, "total_amount": 0.0, "count": 0}
        groups[key]["total_amount"] += r.amount
        groups[key]["count"] += 1

    result = sorted(groups.values(), key=lambda x: x["total_amount"], reverse=True)
    print(f"[STATS] Expense breakdown: {len(result)} ta guruh")
    return result
