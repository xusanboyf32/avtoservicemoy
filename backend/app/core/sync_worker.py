"""
Background thread — internetni kuzatib turadi.
Internet kelganda navbatdagi sync larni yuboradi.
"""
import threading
import time
import requests
from dotenv import load_dotenv
import os

load_dotenv()

SERVER_URL = os.getenv("SYNC_SERVER_URL", "")
_was_online = False


def _check_internet() -> bool:
    if not SERVER_URL:
        return False
    try:
        requests.get(f"{SERVER_URL}/health", timeout=3)
        return True
    except Exception:
        return False


def start_sync_worker(get_db_func, flush_queue_func):
    """
    Background thread ishga tushiradi.
    Internet o'chiq → yoniq bo'lganda navbatni yuboradi.
    """
    if not SERVER_URL:
        print("[SYNC] SYNC_SERVER_URL sozlanmagan, sync o'chirilgan")
        return

    def worker():
        global _was_online
        print("[SYNC] Internet kuzatuvchi ishga tushdi")

        while True:
            is_online = _check_internet()

            # Internet qaytib keldi → navbatni yuborish
            if is_online and not _was_online:
                print("[SYNC] ✅ Internet qaytdi — navbat yuborilmoqda...")
                try:
                    db = next(get_db_func())
                    flush_queue_func(db)
                except Exception as e:
                    print(f"[SYNC] Navbat yuborishda xato: {e}")

            _was_online = is_online
            time.sleep(10)  # har 10 sekundda tekshiradi

    t = threading.Thread(target=worker, daemon=True)
    t.start()

