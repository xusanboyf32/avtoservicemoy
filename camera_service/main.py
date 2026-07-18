import os
import re
import time
import logging
import threading
import numpy as np
import psutil
import cv2

# ── Barcha keraksiz loglarni o'chirish ──────────────────────
os.environ["OPENCV_LOG_LEVEL"] = "ERROR"
os.environ["OPENCV_VIDEOIO_DEBUG"] = "0"
logging.getLogger("open_image_models").setLevel(logging.ERROR)
logging.getLogger("fast_alpr").setLevel(logging.ERROR)
logging.getLogger("fast_plate_ocr").setLevel(logging.ERROR)
logging.getLogger("uvicorn").setLevel(logging.ERROR)
logging.getLogger("uvicorn.access").setLevel(logging.ERROR)
logging.getLogger("fastapi").setLevel(logging.ERROR)
logging.disable(logging.WARNING)

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import uvicorn
from fast_alpr import ALPR
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── .env dan o'qiladi ────────────────────────────────────────
TEST_MODE    = os.getenv("CAMERA_TEST_MODE",    "false").lower() == "true"
DEBUG_WINDOW = os.getenv("CAMERA_DEBUG_WINDOW", "false").lower() == "true"

CAM1_USER = os.getenv("CAMERA_1_USER", "admin")
CAM1_PASS = os.getenv("CAMERA_1_PASS", "")
CAM1_IP   = os.getenv("CAMERA_1_IP",   "")

CAM2_USER = os.getenv("CAMERA_2_USER", "admin")
CAM2_PASS = os.getenv("CAMERA_2_PASS", "")
CAM2_IP   = os.getenv("CAMERA_2_IP",   "")

if TEST_MODE:
    CAM1_SOURCE = 0
    CAM2_SOURCE = None  # test rejimida cam2 ishlamaydi
    print("[SYSTEM] TEST REJIMI — faqat cam1 (webcam) ishlatilmoqda")
else:
    CAM1_SOURCE = f"rtsp://{CAM1_USER}:{CAM1_PASS}@{CAM1_IP}:554/Streaming/Channels/101"
    CAM2_SOURCE = f"rtsp://{CAM2_USER}:{CAM2_PASS}@{CAM2_IP}:554/Streaming/Channels/101"

SOURCES = {"cam1": CAM1_SOURCE, "cam2": CAM2_SOURCE}

# ── Aniqlik sozlamalari ──────────────────────────────────────
CONF_MIN      = float(os.getenv("CONF_MIN",      "0.55"))
PROCESS_EVERY = int(os.getenv("PROCESS_EVERY",   "3"))
EMPTY_RESET   = int(os.getenv("EMPTY_RESET",     "50"))
COUNTDOWN_N   = int(os.getenv("COUNTDOWN_N",     "5"))
CD_STEP_SEC   = float(os.getenv("CD_STEP_SEC",   "1.0"))
MEMORY_LIMIT  = int(os.getenv("MEMORY_LIMIT_MB", "2000"))
ZOOM_DEFAULT  = float(os.getenv("ZOOM_DEFAULT",  "2.0"))
CX_OFFSET_DEF = int(os.getenv("CX_OFFSET",       "0"))
CY_OFFSET_DEF = int(os.getenv("CY_OFFSET",       "80"))

# ── OCR tuzatish ─────────────────────────────────────────────
_L2D = {'O':'0','I':'1','S':'5','B':'8','Z':'2','Q':'0','G':'6','D':'0'}
_D2L = {'0':'O','1':'I','5':'S','8':'B','2':'Z','6':'G'}


def normalize_plate(raw: str):
    s = re.sub(r'[\s\-_\.]', '', raw.upper().strip())
    if not 6 <= len(s) <= 10:
        return None
    c = list(s)
    if len(c) in (8, 9):
        for i in [0, 1]:
            if c[i] in _L2D: c[i] = _L2D[c[i]]
        if c[2].isdigit(): c[2] = _D2L.get(c[2], c[2])
        for i in range(3, len(c) - 2):
            if c[i] in _L2D: c[i] = _L2D[c[i]]
        for i in [len(c) - 2, len(c) - 1]:
            if c[i].isdigit(): c[i] = _D2L.get(c[i], c[i])
        r = ''.join(c)
        if re.match(r'^\d{2}[A-Z]\d{3,4}[A-Z]{2}$', r):
            return f"{r[:2]} {r[2]} {r[3:-2]} {r[-2:]}"
    if len(c) == 8:
        for i in range(5):
            if c[i] in _L2D: c[i] = _L2D[c[i]]
        for i in range(5, 8):
            if c[i].isdigit(): c[i] = _D2L.get(c[i], c[i])
        r = ''.join(c)
        if re.match(r'^\d{5}[A-Z]{3}$', r):
            return f"{r[:2]} {r[2:5]} {r[5:]}"
    return None


def get_conf(raw) -> float:
    if isinstance(raw, list): return sum(raw) / len(raw) if raw else 0.0
    if isinstance(raw, float): return raw
    return 0.0


def apply_zoom(frame, zoom, cx_offset, cy_offset):
    if zoom <= 1.0:
        return frame
    h, w  = frame.shape[:2]
    cx    = w // 2 + cx_offset
    cy    = h // 2 + cy_offset
    nw    = int(w / zoom)
    nh    = int(h / zoom)
    x1    = max(0, cx - nw // 2)
    y1    = max(0, cy - nh // 2)
    x2    = min(w, x1 + nw)
    y2    = min(h, y1 + nh)
    return cv2.resize(frame[y1:y2, x1:x2], (w, h))


def preprocess(frame):
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    frame = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
    kernel = np.array([[-1,-1,-1],[-1,9,-1],[-1,-1,-1]])
    return cv2.filter2D(frame, -1, kernel)


# ── Global holatlar ──────────────────────────────────────────
def make_state(name):
    return {
        "name":          name,
        "camera_ok":     False,
        "running":       True,   # on/off boshqaruvi
        "last_plate":    None,
        "last_time":     None,
        "is_new":        False,
        "current_frame": None,
        # UI
        "locked":        False,
        "empty":         0,
        "empty_ts":      0.0,
        "total":         0,
        "flash":         0,
        "countdown":     COUNTDOWN_N,
        "cd_step_ts":    0.0,
        "cd_text":       "",
        "cd_bb":         None,
        "cd_conf":       0.0,
        # Zoom
        "zoom":          ZOOM_DEFAULT,
        "cx_offset":     CX_OFFSET_DEF,
        "cy_offset":     CY_OFFSET_DEF,
    }


cam_states = {
    "cam1": make_state("1-eshik"),
    "cam2": make_state("2-eshik"),
}

# Oyna holati
window_state = {
    "visible":    True,
    "split_mode": True,
    "active_cam": "cam1",
    "width":      1284,
    "height":     480,
}

log_file = None


# ── Faqat muhim xabarlar ─────────────────────────────────────
def log_print(msg: str):
    """Faqat muhim xabarlarni chiqaradi — boshqa hech narsa emas"""
    print(msg)


# ── UI — asl kod draw_ui() dan ───────────────────────────────
def draw_ui(frame, st):
    h, w      = frame.shape[:2]
    cx, cy    = w // 2, h // 2
    locked    = st["locked"]
    flash     = st["flash"]
    countdown = st["countdown"]
    zoom      = st["zoom"]
    color     = (0, 180, 255) if locked else (0, 255, 80)

    # Yuqori panel
    cv2.rectangle(frame, (0, 0), (w, 78), (18, 18, 18), -1)
    cv2.putText(frame, f"AVTOMOBIL RAQAMI — {st['name']}",
        (15, 30), cv2.FONT_HERSHEY_DUPLEX, 0.75, (0, 210, 255), 2)
    cv2.putText(frame, datetime.now().strftime("%Y-%m-%d   %H:%M:%S"),
        (15, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (140, 140, 140), 1)
    cv2.putText(frame, f"Zoom: {zoom:.1f}x",
        (w - 120, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 210, 255), 1)
    cv2.putText(frame, "+/-zoom  WASD-siljish  SPACE-full/split",
        (w - 370, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 80, 80), 1)

    # Kutish timeri
    if locked and st["empty_ts"] > 0:
        waited  = time.time() - st["empty_ts"]
        total_w = EMPTY_RESET * PROCESS_EVERY / 30.0
        remain  = max(0.0, total_w - waited)
        ratio   = remain / total_w
        tx, ty  = w - 155, 85
        cv2.rectangle(frame, (tx, ty), (tx+138, ty+52), (18, 18, 18), -1)
        cv2.rectangle(frame, (tx, ty), (tx+138, ty+52), (0, 255, 80), 1)
        cv2.putText(frame, "YANGI RAQAM",
            (tx+8, ty+18), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 255, 80), 1)
        cv2.putText(frame, f"{remain:.1f}s kutilmoqda",
            (tx+8, ty+38), cv2.FONT_HERSHEY_SIMPLEX, 0.44, (0, 255, 80), 1)
        bx1, bx2 = tx+6, tx+132
        cv2.rectangle(frame, (bx1, ty+44), (bx2, ty+50), (30, 30, 30), -1)
        cv2.rectangle(frame, (bx1, ty+44),
            (bx1 + int((bx2-bx1)*ratio), ty+50), (0, 255, 80), -1)

    # Countdown doirasi
    if not locked and 0 < countdown < COUNTDOWN_N:
        num_str = str(countdown)
        ov = frame.copy()
        cv2.circle(ov, (cx, cy), 90, (0, 30, 15), -1)
        cv2.addWeighted(ov, 0.30, frame, 0.70, 0, frame)
        cv2.circle(frame, (cx, cy), 90, (0, 255, 80), 2, cv2.LINE_AA)
        done  = COUNTDOWN_N - countdown
        angle = int(360 * done / COUNTDOWN_N)
        cv2.ellipse(frame, (cx, cy), (74, 74), -90, 0, angle,
            (0, 255, 80), 4, cv2.LINE_AA)
        fs = 4.5
        tw, th = cv2.getTextSize(num_str, cv2.FONT_HERSHEY_DUPLEX, fs, 6)[0]
        nx, ny = cx - tw//2, cy + th//2 + 8
        cv2.putText(frame, num_str, (nx+3, ny+3),
            cv2.FONT_HERSHEY_DUPLEX, fs, (0, 0, 0), 10, cv2.LINE_AA)
        cv2.putText(frame, num_str, (nx, ny),
            cv2.FONT_HERSHEY_DUPLEX, fs, (0, 255, 80), 6, cv2.LINE_AA)

    # Nishon burchaklari
    nw2, nh2 = 300, 95
    for (cx1, cy1), (hx, hy), (vx, vy) in [
        ((cx-nw2, cy-nh2), (cx-nw2+50, cy-nh2), (cx-nw2, cy-nh2+35)),
        ((cx+nw2, cy-nh2), (cx+nw2-50, cy-nh2), (cx+nw2, cy-nh2+35)),
        ((cx-nw2, cy+nh2), (cx-nw2+50, cy+nh2), (cx-nw2, cy+nh2-35)),
        ((cx+nw2, cy+nh2), (cx+nw2-50, cy+nh2), (cx+nw2, cy+nh2-35)),
    ]:
        cv2.line(frame, (cx1, cy1), (hx, hy), color, 4)
        cv2.line(frame, (cx1, cy1), (vx, vy), color, 4)
    cv2.rectangle(frame, (cx-nw2, cy-nh2), (cx+nw2, cy+nh2), color, 1)

    msg = "ANIQLANDI — KEYINGI MASHINANI KUTING" if locked else "MASHINA KUTILMOQDA..."
    cv2.putText(frame, msg, (15, h - 115),
        cv2.FONT_HERSHEY_SIMPLEX, 0.52, color, 2)

    # Pastki panel
    cv2.rectangle(frame, (0, h-105), (w, h), (18, 18, 18), -1)
    if st["last_plate"]:
        if flash > 0:
            alpha   = min(flash / 30, 1.0)
            overlay = frame.copy()
            cv2.rectangle(overlay, (15, h-100), (260, h-63), (0, 160, 65), -1)
            cv2.addWeighted(overlay, alpha, frame, 1-alpha, 0, frame)
            cv2.putText(frame, "  \u2713  ANIQLANDI!",
                (22, h-74), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (255, 255, 255), 2)
        cv2.putText(frame, st["last_plate"],
            (15, h-26), cv2.FONT_HERSHEY_DUPLEX, 1.3, (0, 255, 255), 3)
        cv2.putText(frame,
            f"Vaqt: {st['last_time']}   |   Jami: {st['total']} ta",
            (15, h-6), cv2.FONT_HERSHEY_SIMPLEX, 0.46, (130, 130, 130), 1)
    else:
        cv2.putText(frame, "Mashina kutilmoqda...",
            (15, h-48), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (90, 90, 90), 1)

    return frame


# ── Kamera loop ──────────────────────────────────────────────
def camera_loop(cam_id: str, source):
    st = cam_states[cam_id]

    while True:
        # Kamera o'chirilgan bo'lsa — kutib turadi
        if not st["running"]:
            time.sleep(1)
            continue

        # RAM nazorati
        mem = psutil.Process().memory_info().rss / 1024 / 1024
        if mem > MEMORY_LIMIT:
            log_print(f"[{st['name']}] RAM {mem:.0f}MB — qayta ishga tushirilmoqda")
            os._exit(1)

        cap = cv2.VideoCapture(source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not cap.isOpened():
            st["camera_ok"] = False
            time.sleep(5)
            continue

        st["camera_ok"] = True
        log_print(f"[{st['name']}] Ulandi")

        try:
            alpr = ALPR(
                detector_model="yolo-v9-t-384-license-plate-end2end",
                ocr_model="global-plates-mobile-vit-v2-model",
            )
        except Exception as e:
            log_print(f"[{st['name']}] Model xato: {e}")
            time.sleep(5)
            continue

        frame_count = 0

        while st["running"]:
            ret, frame = cap.read()
            if not ret:
                st["camera_ok"] = False
                break

            frame_count += 1
            now    = datetime.now()
            now_ts = time.time()

            frame = apply_zoom(frame, st["zoom"], st["cx_offset"], st["cy_offset"])

            if frame_count % PROCESS_EVERY == 0:
                try:
                    results = alpr.predict(preprocess(frame))
                except Exception:
                    results = []

                if not results:
                    if st["empty"] == 0:
                        st["empty_ts"] = now_ts
                    st["empty"] += 1
                    if not st["locked"] and st["countdown"] < COUNTDOWN_N:
                        st["countdown"]  = COUNTDOWN_N
                        st["cd_step_ts"] = 0.0
                        st["cd_text"]    = ""
                        st["cd_bb"]      = None
                    if st["locked"] and st["empty"] >= EMPTY_RESET:
                        st["locked"]     = False
                        st["empty"]      = 0
                        st["countdown"]  = COUNTDOWN_N
                        st["cd_step_ts"] = 0.0
                        log_print(f"[{st['name']}] Mashina kutilmoqda...")
                else:
                    st["empty"]    = 0
                    st["empty_ts"] = 0.0

                if not st["locked"] and results:
                    best_plate = None
                    best_conf  = 0.0
                    best_text  = None
                    best_bb    = None

                    for plate in results:
                        ocr = plate.ocr
                        if not ocr or not ocr.text:
                            continue
                        conf = get_conf(ocr.confidence)
                        if conf > best_conf:
                            best_conf  = conf
                            best_plate = plate
                            best_text  = ocr.text
                            best_bb    = plate.detection.bounding_box

                    if best_plate and best_conf >= CONF_MIN:
                        normalized = normalize_plate(best_text)
                        label = normalized if normalized else best_text.strip().upper()

                        x1, y1 = int(best_bb.x1), int(best_bb.y1)
                        x2, y2 = int(best_bb.x2), int(best_bb.y2)
                        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,255,80), 3)

                        if label != st["cd_text"]:
                            st["countdown"]  = COUNTDOWN_N
                            st["cd_step_ts"] = now_ts

                        st["cd_text"] = label
                        st["cd_bb"]   = best_bb
                        st["cd_conf"] = best_conf

                        if st["cd_step_ts"] == 0.0:
                            st["cd_step_ts"] = now_ts

                        if now_ts - st["cd_step_ts"] >= CD_STEP_SEC:
                            st["countdown"]  -= 1
                            st["cd_step_ts"]  = now_ts

                        if st["countdown"] <= 0:
                            st["locked"]     = True
                            st["last_plate"] = label
                            st["last_time"]  = now.strftime("%H:%M:%S")
                            st["total"]     += 1
                            st["flash"]      = 120
                            st["is_new"]     = True
                            st["countdown"]  = COUNTDOWN_N
                            st["cd_step_ts"] = 0.0

                            ts = now.strftime("%Y-%m-%d %H:%M:%S")
                            # ── FAQAT SHU XABAR CHIQADI ──────────
                            log_print(
                                f"\n  ✅ ANIQLANDI  : {label}\n"
                                f"  Ishonch      : {best_conf:.0%}\n"
                                f"  Kamera       : {st['name']}\n"
                                f"  Vaqt         : {ts}\n"
                            )
                            if log_file:
                                log_file.write(
                                    f"{ts} | {st['name']} | {label} | {best_conf:.2f}\n"
                                )
                                log_file.flush()

                    elif best_plate:
                        x1, y1 = int(best_bb.x1), int(best_bb.y1)
                        x2, y2 = int(best_bb.x2), int(best_bb.y2)
                        cv2.rectangle(frame, (x1,y1), (x2,y2), (0,165,255), 2)
                        cv2.putText(frame, f"? {best_conf:.0%}",
                            (x1, y1-8), cv2.FONT_HERSHEY_SIMPLEX,
                            0.6, (0,165,255), 2)

            if st["flash"] > 0:
                st["flash"] -= 1

            if DEBUG_WINDOW:
                frame = draw_ui(frame, st)

            ret2, jpeg = cv2.imencode('.jpg', frame,
                [cv2.IMWRITE_JPEG_QUALITY, 80])
            if ret2:
                st["current_frame"] = jpeg.tobytes()

        cap.release()


# ── Oyna loop ────────────────────────────────────────────────
def window_loop():
    cv2.namedWindow("Murodoil LPR", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Murodoil LPR", 1284, 480)

    W, H   = 640, 480
    blank  = np.zeros((H, W, 3), dtype=np.uint8)

    while True:
        if not window_state["visible"]:
            cv2.destroyAllWindows()
            time.sleep(0.5)
            continue

        frames = {}
        for cam_id in ["cam1", "cam2"]:
            raw = cam_states[cam_id]["current_frame"]
            if raw:
                arr = np.frombuffer(raw, np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                frames[cam_id] = cv2.resize(img, (W, H)) if img is not None else blank.copy()
            else:
                ph = blank.copy()
                st = cam_states[cam_id]
                msg = "O'chirilgan" if not st["running"] else "Ulanmoqda..."
                cv2.putText(ph, f"{st['name']} — {msg}",
                    (W//2-140, H//2), cv2.FONT_HERSHEY_SIMPLEX,
                    0.7, (80, 80, 80), 2)
                frames[cam_id] = ph

        split = window_state["split_mode"]
        active = window_state["active_cam"]

        if split:
            div  = np.ones((H, 4, 3), dtype=np.uint8) * 150
            view = np.hstack([frames["cam1"], div, frames["cam2"]])
        else:
            view = cv2.resize(frames[active], (1280, 720))

        cv2.imshow("Murodoil LPR", view)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('q'):
            break

        elif key == ord(' '):
            window_state["split_mode"] = not window_state["split_mode"]
            if window_state["split_mode"]:
                cv2.resizeWindow("Murodoil LPR", 1284, 480)
            else:
                cv2.resizeWindow("Murodoil LPR", 1280, 720)

        elif key == 9:  # TAB
            if not split:
                window_state["active_cam"] = (
                    "cam2" if active == "cam1" else "cam1"
                )

        elif key == ord('1'):
            window_state["active_cam"] = "cam1"

        elif key == ord('2'):
            window_state["active_cam"] = "cam2"

        target = window_state["active_cam"]

        if key == ord('+') or key == ord('='):
            cam_states[target]["zoom"] = min(
                cam_states[target]["zoom"] + 0.2, 6.0)

        elif key == ord('-'):
            cam_states[target]["zoom"] = max(
                cam_states[target]["zoom"] - 0.2, 1.0)

        elif key == ord('w'):
            cam_states[target]["cy_offset"] -= 30

        elif key == ord('s'):
            cam_states[target]["cy_offset"] += 30

        elif key == ord('a'):
            cam_states[target]["cx_offset"] -= 30

        elif key == ord('d'):
            cam_states[target]["cx_offset"] += 30

    cv2.destroyAllWindows()


# ── FastAPI ──────────────────────────────────────────────────
app = FastAPI(title="Murodoil Camera Service v3.0")


# 5. Raqam qayerga uzatiladi — bu endpoint orqali
@app.get("/plate")
def get_plate():
    """
    Backend har 1.5 sekundda shu endpointga so'rov yuboradi.
    Yangi raqam bo'lsa qaytaradi, bo'lmasa bo'sh.
    """
    result = []
    for cam_id, st in cam_states.items():
        if st["is_new"]:
            st["is_new"] = False
            result.append({
                "plate":  st["last_plate"],
                "time":   st["last_time"],
                "camera": cam_id,
                "name":   st["name"],
            })
    return result


@app.get("/health")
def health():
    return {
        "cam1": {
            "connected": cam_states["cam1"]["camera_ok"],
            "running":   cam_states["cam1"]["running"],
            "total":     cam_states["cam1"]["total"],
        },
        "cam2": {
            "connected": cam_states["cam2"]["camera_ok"],
            "running":   cam_states["cam2"]["running"],
            "total":     cam_states["cam2"]["total"],
        },
    }


# ── Kamera on/off (admin va kassir uchun) ───────────────────
@app.post("/camera/{cam_id}/stop")
def stop_camera(cam_id: str):
    """Kamerani to'xtatish"""
    if cam_id not in cam_states:
        return {"ok": False, "error": "Kamera topilmadi"}
    cam_states[cam_id]["running"] = False
    cam_states[cam_id]["camera_ok"] = False
    log_print(f"[{cam_states[cam_id]['name']}] O'chirildi")
    return {"ok": True, "cam": cam_id, "running": False}


@app.post("/camera/{cam_id}/start")
def start_camera(cam_id: str):
    """Kamerani yoqish"""
    if cam_id not in cam_states:
        return {"ok": False, "error": "Kamera topilmadi"}
    if cam_states[cam_id]["running"]:
        return {"ok": True, "msg": "Allaqachon ishlamoqda"}
    cam_states[cam_id]["running"] = True
    source = SOURCES.get(cam_id)
    if source is None:
        return {"ok": False, "error": "Manba yo'q (test rejimi?)"}
    threading.Thread(
        target=camera_loop,
        args=(cam_id, source),
        daemon=True
    ).start()
    log_print(f"[{cam_states[cam_id]['name']}] Yoqildi")
    return {"ok": True, "cam": cam_id, "running": True}


# ── Oyna boshqaruvi (admin uchun) ───────────────────────────
@app.post("/window/show")
def show_window():
    """Oynani ko'rsatish"""
    window_state["visible"] = True
    return {"visible": True}


@app.post("/window/hide")
def hide_window():
    """Oynani yashirish"""
    window_state["visible"] = False
    return {"visible": False}


@app.post("/window/split")
def set_split():
    """Split screen (ikkala kamera)"""
    window_state["split_mode"] = True
    return {"mode": "split"}


@app.post("/window/full/{cam_id}")
def set_full(cam_id: str):
    """Bitta kamera — to'liq ekran"""
    window_state["split_mode"] = False
    window_state["active_cam"] = cam_id
    return {"mode": "full", "cam": cam_id}


# ── Stream ───────────────────────────────────────────────────
def _mjpeg(cam_id):
    while True:
        frame = cam_states[cam_id]["current_frame"]
        if frame:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n'
                   + frame + b'\r\n')
        time.sleep(0.08)


@app.get("/stream/cam1")
def stream1():
    return StreamingResponse(
        _mjpeg("cam1"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/stream/cam2")
def stream2():
    return StreamingResponse(
        _mjpeg("cam2"),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ── Ishga tushirish ──────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("  MURODOIL CAMERA SERVICE v3.0")
    print(f"  Rejim : {'TEST (webcam)' if TEST_MODE else 'REAL (RTSP)'}")
    print(f"  Oyna  : {'HA' if DEBUG_WINDOW else 'YOQ'}")
    print("=" * 50)

    log_file = open("natijalar.txt", "a", encoding="utf-8")

    # Cam1 — har doim
    threading.Thread(
        target=camera_loop,
        args=("cam1", CAM1_SOURCE),
        daemon=True
    ).start()

    # Cam2 — faqat real rejimda
    if not TEST_MODE and CAM2_SOURCE:
        threading.Thread(
            target=camera_loop,
            args=("cam2", CAM2_SOURCE),
            daemon=True
        ).start()

    # Oyna — faqat DEBUG_WINDOW=true da
    if DEBUG_WINDOW:
        threading.Thread(
            target=window_loop,
            daemon=False
        ).start()

    uvicorn.run(app, host="127.0.0.1", port=9001, log_level="error")



