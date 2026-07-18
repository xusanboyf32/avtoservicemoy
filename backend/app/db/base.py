from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# SQLite'mi yoki PostgreSQL'mi — manzilga qarab aniqlaymiz
IS_SQLITE = settings.DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    # SQLite uchun maxsus sozlamalar
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30
        }
    )

    # PRAGMA — faqat SQLite'da ishlaydi
    @event.listens_for(engine, "connect")
    def set_pragmas(connection, _):
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA synchronous=NORMAL")

else:
    # PostgreSQL uchun
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,   # uzilgan ulanishni avtomatik tekshiradi
        pool_size=10,         # bir vaqtda 10 ta ulanish
        max_overflow=20,      # kerak bo'lsa yana 20 ta
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
