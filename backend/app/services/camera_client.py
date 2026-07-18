"""
Kamera xizmati (camera_service.exe, port 9001) bilan bog'lanish.
Agar kamera ishlamasa — xato bermaydi, None qaytaradi.
"""
import requests

CAMERA_URL = "http://127.0.0.1:9001"


def get_plates_from_camera() -> list:
    """
    Yangi aniqlangan raqamlar ro'yxatini qaytaradi.
    Har bir raqam faqat BIR MARTA qaytariladi (is_new flag).
    Kamera ishlamasa — bo'sh ro'yxat qaytaradi, xato yo'q.
    """
    try:
        r = requests.get(f"{CAMERA_URL}/plate", timeout=2)
        if r.status_code == 200:
            return r.json()  # [{"plate": "01 A 123 BC", "time": "...", "camera": "cam1"}]
    except requests.exceptions.RequestException:
        pass
    return []


def get_camera_health() -> dict:
    """Kamera holati — ulangan/uzilgan"""
    try:
        r = requests.get(f"{CAMERA_URL}/health", timeout=2)
        if r.status_code == 200:
            return r.json()
    except requests.exceptions.RequestException:
        pass
    return {
        "cam1": {"connected": False, "running": False, "total": 0},
        "cam2": {"connected": False, "running": False, "total": 0},
    }


def control_camera(cam_id: str, action: str) -> dict:
    """
    Kamerani yoqish/o'chirish.
    action: "start" yoki "stop"
    """
    try:
        r = requests.post(f"{CAMERA_URL}/camera/{cam_id}/{action}", timeout=2)
        if r.status_code == 200:
            return r.json()
    except requests.exceptions.RequestException:
        pass
    return {"ok": False, "error": "Kamera xizmatiga ulanib bo'lmadi"}






# """
# Asosiy backend kamera xizmati bilan shu orqali gaplashadi.
# Agar kamera xizmati ishlamasa, xato bermaydi, None qaytaradi.
# """
# import requests
#
# CAMERA_SERVICE_URL = "http://127.0.0.1:9001"
#
#
# def get_plate_from_camera() -> dict | None:
#     try:
#         r = requests.get(f"{CAMERA_SERVICE_URL}/plate", timeout=2)
#         if r.status_code == 200:
#             return r.json()
#     except requests.exceptions.RequestException:
#         pass
#     return None
#
#
# def get_camera_status() -> dict:
#     try:
#         r = requests.get(f"{CAMERA_SERVICE_URL}/health", timeout=2)
#         if r.status_code == 200:
#             return r.json()
#     except requests.exceptions.RequestException:
#         pass
#     return {"status": "offline", "camera_connected": False}
#
