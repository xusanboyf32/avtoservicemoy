from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from app.models.client import Client
from app.core.security import create_access_token

SHARED_CLIENT_PASSWORD = "1234"  # hamma mijoz uchun default parol


def _only_digits(phone: str) -> str:
    """Faqat raqamlarni qoldiradi: +998 90 123 45 67 -> 998901234567"""
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def login_client(db: Session, phone: str, password: str) -> dict:
    if password != SHARED_CLIENT_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telefon yoki parol xato!"
        )

    phone_norm = _only_digits(phone)
    if not phone_norm:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telefon raqam kiritilmadi!"
        )

    # Bazadagi barcha raqamlarni normalize qilib solishtiramiz
    # (chunki bazada +998, 998, bo'sh joy har xil bo'lishi mumkin)
    client = None
    for c in db.query(Client).filter(Client.phone.isnot(None)).all():
        if _only_digits(c.phone) == phone_norm:
            client = c
            break

    if not client:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bu raqam ro'yxatda yo'q!"
        )

    access_token = create_access_token(
        data={
            "sub": str(client.id),
            "type": "client",   # user tokenidan ajratish uchun
        },
        expires_delta=timedelta(days=30),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "client_id": client.id,
        "full_name": client.full_name,
    }

