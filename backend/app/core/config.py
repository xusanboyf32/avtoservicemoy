from pydantic_settings import BaseSettings
from pathlib import Path
import sys


def get_base_dir() -> Path:
    if getattr(sys, 'frozen', False):
        # .exe holatida
        return Path(sys.executable).parent
    # Local holatida — backend/ papkasi
    return Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    API_HOST: str = "127.0.0.1"
    API_PORT: int = 8000
    CAMERA_IP: str
    CAMERA_USER: str
    CAMERA_PASS: str
    CAMERA_CHANNEL: int
    XPRINTER_PORT: str
    GODEX_PORT: str
    GODEX_PRINTER_NAME: str = "Godex G500-U"
    LABEL_WIDTH: int = 40
    LABEL_HEIGHT: int = 30

    # ── Printer ──────────────────────────────────────────
    PRINTER_NAME: str = "XP-80C"

    # ── Do'kon ma'lumotlari ───────────────────────────────
    SHOP_NAME: str = "MUROD OIL"
    SHOP_SUB: str = "OIL CHANGE"
    SHOP_ADDRESS: str = "QO'QON SHAHAR, TURKISTON-3Z"
    SHOP_PHONE: str = "+998911400000"

    # ── Sync ─────────────────────────────────────────────
    SYNC_SERVER_URL: str = ""
    SYNC_TOKEN: str = ""

    class Config:
        env_file = str(get_base_dir() / ".env")
        env_file_encoding = "utf-8"


    # ── Do'kon ma'lumotlari ───────────────────────────────
    # SHOP_NAME: str = "MUROD OIL"
    # SHOP_SUB: str = "OIL CHANGE"
    # SHOP_ADDRESS: str = "QO'QON SHAHAR, TURKISTON-3Z"
    # SHOP_PHONE: str = "+998911400000"
    #
    # class Config:
    #     env_file = str(get_base_dir() / ".env")
    #     env_file_encoding = "utf-8"


settings = Settings()
