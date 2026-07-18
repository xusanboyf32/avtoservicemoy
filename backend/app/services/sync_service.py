"""
EXE → Server sync xizmati.
Ma'lumot o'zgarganda darhol chaqiriladi.
Internet yo'q bo'lsa SyncQueue ga yoziladi.
"""
import json
import requests
import threading
from sqlalchemy.orm import Session
from app.models.sync_queue import SyncQueue
from dotenv import load_dotenv
import os
from app.core.config import settings


load_dotenv()

# SERVER_URL = os.getenv("SYNC_SERVER_URL", "")
# SYNC_TOKEN = os.getenv("SYNC_TOKEN", "")


SERVER_URL = settings.SYNC_SERVER_URL
SYNC_TOKEN = settings.SYNC_TOKEN



# Sync ishlayaptimi (thread lock)
_sync_lock = threading.Lock()


def _headers():
    return {
        "Authorization": f"Bearer {SYNC_TOKEN}",
        "Content-Type": "application/json"
    }


def _is_server_available() -> bool:
    """Server mavjudligini tekshirish"""
    if not SERVER_URL:
        return False
    try:
        r = requests.get(f"{SERVER_URL}/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def push_to_server(table_name: str, action: str, payload: dict) -> bool:
    """
    Serverga ma'lumot yuborish.
    Muvaffaqiyatli bo'lsa True, bo'lmasa False.
    """
    if not SERVER_URL:
        return False

    try:
        r = requests.post(
            f"{SERVER_URL}/sync/{table_name}",
            json={"action": action, "data": payload},
            headers=_headers(),
            timeout=5
        )
        return r.status_code == 200
    except Exception as e:
        print(f"[SYNC] Server bilan bog'lanib bo'lmadi: {e}")
        return False


def sync_or_queue(db: Session, table_name: str, action: str, payload: dict):
    """
    Asosiy funksiya — har bir create/update/delete dan keyin chaqiriladi.

    1. Server mavjud bo'lsa → darhol yuboradi
    2. Server yo'q bo'lsa → SyncQueue ga yozadi
    """
    if not SERVER_URL:
        return  # Sync sozlanmagan — o'tkazib yuborish

    sent = push_to_server(table_name, action, payload)

    if not sent:
        # Navbatga qo'shish
        queue_item = SyncQueue(
            table_name=table_name,
            action=action,
            payload=json.dumps(payload),
            sent=False,
            attempts=0
        )
        db.add(queue_item)
        db.commit()
        print(f"[SYNC] Navbatga qo'shildi: {table_name}/{action}")
    else:
        print(f"[SYNC] Yuborildi: {table_name}/{action}")


def flush_queue(db: Session):
    """
    Navbatdagi yuborilmagan ma'lumotlarni yuborish.
    Internet kelganda chaqiriladi.
    """
    with _sync_lock:
        pending = db.query(SyncQueue).filter(
            SyncQueue.sent == False,
            SyncQueue.attempts < 3
        ).order_by(SyncQueue.created_at.asc()).all()

        if not pending:
            return

        print(f"[SYNC] Navbatda {len(pending)} ta yozuv bor, yuborilmoqda...")

        for item in pending:
            try:
                payload = json.loads(item.payload)
                sent = push_to_server(item.table_name, item.action, payload)

                if sent:
                    item.sent = True
                    print(f"[SYNC] ✅ Yuborildi: {item.table_name}/{item.action}")
                else:
                    item.attempts += 1
                    item.error = "Server javob bermadi"
                    print(f"[SYNC] ❌ Urinish {item.attempts}/3: {item.table_name}")

            except Exception as e:
                item.attempts += 1
                item.error = str(e)
                print(f"[SYNC] ❌ Xato: {e}")

        db.commit()

