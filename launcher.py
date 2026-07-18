"""
Bu — kassir bosadigan YAGONA narsa (keyinchalik MurodoilPOS.exe
bo'ladi). Backend va kamera xizmatini watchdog bilan ishga tushiradi.
"""
import subprocess
import threading
import time
import requests
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def run_with_watchdog(exe_path: str, name: str, cwd: str):
    """
    Process qulab tushsa (crash, exit code != 0), 3 sekunddan
    keyin avtomatik qayta ishga tushiradi. Cheksiz davom etadi.
    """
    while True:
        print(f"[WATCHDOG] {name} ishga tushmoqda...")
        process = subprocess.Popen(
            [exe_path],
            cwd=cwd,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        process.wait()
        print(f"[WATCHDOG] {name} to'xtadi (exit code: {process.returncode}). 3 sekunddan keyin qayta ishga tushadi...")
        time.sleep(3)


def wait_for_service(url: str, name: str, timeout: int = 30) -> bool:
    for _ in range(timeout * 2):
        try:
            r = requests.get(url, timeout=1)
            if r.status_code == 200:
                print(f"[LAUNCHER] ✓ {name} tayyor")
                return True
        except requests.exceptions.RequestException:
            pass
        time.sleep(0.5)
    return False


if __name__ == "__main__":
    # Kamera xizmatini watchdog bilan fonda ishga tushirish
    camera_thread = threading.Thread(
        target=run_with_watchdog,
        args=(
            os.path.join(BASE_DIR, "camera_service", "camera_service.exe"),
            "Kamera xizmati",
            os.path.join(BASE_DIR, "camera_service")
        ),
        daemon=True
    )
    camera_thread.start()

    # Backend'ni watchdog bilan fonda ishga tushirish
    backend_thread = threading.Thread(
        target=run_with_watchdog,
        args=(
            os.path.join(BASE_DIR, "backend", "main.exe"),
            "Backend",
            os.path.join(BASE_DIR, "backend")
        ),
        daemon=True
    )
    backend_thread.start()

    # Backend tayyor bo'lguncha kutamiz (kamera ixtiyoriy, kutmaymiz)
    print("[LAUNCHER] Backend tayyor bo'lishini kutmoqda...")
    if wait_for_service("http://127.0.0.1:8000/health", "Backend"):
        # Bu yerda Electron yoki webview oynasi ochiladi
        print("[LAUNCHER] Dastur tayyor! http://127.0.0.1:8000")
        # Hozircha frontend yo'q, shuning uchun shunchaki kutib turamiz
        while True:
            time.sleep(60)
    else:
        print("[LAUNCHER] ✗ Backend ishga tushmadi!")
        input("Chiqish uchun Enter bosing...")