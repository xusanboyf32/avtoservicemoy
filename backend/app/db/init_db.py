from sqlalchemy.orm import Session
from app.db.base import Base, engine, SessionLocal
from app.models.users import User, Permission, RoleEnum
from app.models.category import Category
from app.models.brand import Brand
from app.models.unit import Unit
from app.models.kontragent import Kontragent
from app.models.product import Product
from app.models.batch import Batch
from app.models.income import Income, IncomeItem
from app.models.payment import IncomePayment
from app.models.client import Client
from app.models.oil_record import OilRecord
from app.models.warehouse_stock import WarehouseStock
from app.models.kassa_stock import KassaStock
from app.models.warehouse_transfer import WarehouseTransfer, TransferItem
from app.models.kassa_page import KassaPage
from app.models.sale import Sale, SaleItem
from app.models.client_debt import ClientDebt, ClientDebtPayment
from app.models.daily_stat import DailyStat
from app.models.sale_return import SaleReturn

from app.core.security import hash_password
from app.core.permissions import ROLE_DEFAULT_PERMISSIONS
from app.models.sync_queue import SyncQueue
from app.models.sale_return import SaleReturn

def create_tables():
    """Barcha jadvallarni yaratadi"""
    Base.metadata.create_all(bind=engine)


def create_permission(db: Session, user: User):
    """
    User yaratilganda permission avtomatik yaratiladi
    Role ga qarab default permissionlar qo'yiladi
    """
    default_perms = ROLE_DEFAULT_PERMISSIONS.get(user.role, {})
    permission = Permission(
        user_id=user.id,
        **default_perms
    )
    db.add(permission)
    db.commit()


def create_superadmin(db: Session):
    """
    Superadmin mavjud bo'lmasa avtomatik yaratadi
    Dastur birinchi ochilganda bir marta ishlaydi
    """
    superadmin = db.query(User).filter(
        User.role == RoleEnum.superadmin
    ).first()

    if not superadmin:
        superadmin = User(
            username="superadmin",
            password=hash_password("1234"),
            role=RoleEnum.superadmin
        )
        db.add(superadmin)
        db.flush()
        create_permission(db, superadmin)
        print("✅ Superadmin yaratildi!")
    else:
        print("✅ Superadmin allaqachon mavjud!")


def create_kassa_pages(db: Session):
    """
    17 ta kassa page yaratadi
    Dastur birinchi ochilganda bir marta ishlaydi
    """
    existing = db.query(KassaPage).first()
    if not existing:
        for i in range(1, 18):
            page = KassaPage(
                page_number=i,
                status="bosh",
                items=[]
            )
            db.add(page)
        db.commit()
        print("✅ 17 ta kassa page yaratildi!")
    else:
        print("✅ Kassa pagelar allaqachon mavjud!")


def init_db():
    """
    Dastur ishga tushganda bir marta chaqiriladi
    main.py dan chaqiriladi
    """
    # 1. Jadvallar yaratiladi
    create_tables()
    print("✅ Jadvallar yaratildi!")

    # 2. Superadmin yaratiladi
    db = SessionLocal()
    try:
        create_superadmin(db)
        create_kassa_pages(db)
    finally:
        db.close()


