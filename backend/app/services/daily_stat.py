from sqlalchemy.orm import Session
from datetime import date
from app.models.daily_stat import DailyStat



def get_or_create_daily_stat(db: Session) -> DailyStat:
    """Bugungi kunlik statistikani oladi yoki yaratadi"""

    today = date.today()

    stat = db.query(DailyStat).filter(
        DailyStat.date == today
    ).first()

    if not stat:
        stat = DailyStat(
            date=today,
            total_sales=0.0,
            cash_amount=0.0,

            card_amount=0.0,  # YANGI
            mixed_amount=0.0,  # YANGI

            debt_amount=0.0,
            return_amount=0.0,
            monthly_sales=0.0,
            monthly_cash=0.0,
            monthly_debt=0.0
        )
        db.add(stat)
        db.flush()
        print(f"[DAILY_STAT] Yangi kun: {today}")

    return stat

def update_daily_stat(
        db: Session,
        total_sales: float = 0.0,
        cash_amount: float = 0.0,
        card_amount: float = 0.0,  # YANGI
        mixed_amount: float = 0.0,  # YANGI
        debt_amount: float = 0.0,
        return_amount: float = 0.0
) -> DailyStat:

    print(
        f"[DAILY_STAT] Yangilash: savdo={total_sales} | naqd={cash_amount} | karta={card_amount} | aralash={mixed_amount}")

    from app.services.cash_register import add_sale_amount
    add_sale_amount(db, naqd_amount=cash_amount, karta_amount=card_amount)

    stat = get_or_create_daily_stat(db)



    # Kunlik
    stat.total_sales += total_sales
    stat.cash_amount += cash_amount
    stat.card_amount += card_amount
    stat.mixed_amount += mixed_amount
    stat.debt_amount += debt_amount
    stat.return_amount += return_amount

    # Oylik
    stat.monthly_sales += total_sales
    stat.monthly_cash += cash_amount
    stat.monthly_debt += debt_amount

    # Manfiy bo'lmasin
    if stat.total_sales < 0: stat.total_sales = 0
    if stat.cash_amount < 0: stat.cash_amount = 0
    if stat.card_amount < 0: stat.card_amount = 0
    if stat.mixed_amount < 0: stat.mixed_amount = 0
    if stat.debt_amount < 0: stat.debt_amount = 0

    db.commit()
    db.refresh(stat)

    print(f"[DAILY_STAT] Yangilandi: jami={stat.total_sales}")
    return stat





def get_daily_stat(db: Session) -> DailyStat:
    """Bugungi statistika"""

    print(f"[DAILY_STAT] Bugungi statistika so'raldi")

    return get_or_create_daily_stat(db)


def get_monthly_stats(db: Session) -> list:
    """Oylik statistika"""

    print(f"[DAILY_STAT] Oylik statistika so'raldi")

    from datetime import datetime
    first_day = date(datetime.now().year, datetime.now().month, 1)

    stats = db.query(DailyStat).filter(
        DailyStat.date >= first_day
    ).order_by(DailyStat.date.desc()).all()

    print(f"[DAILY_STAT] Topildi: {len(stats)} kun")

    return stats

