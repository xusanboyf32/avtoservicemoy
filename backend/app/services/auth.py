from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from app.models.users import User
from app.core.security import verify_password, create_access_token
from app.core.config import settings


def login_user(db: Session, username: str, password: str) -> dict:

    print(f"[LOGIN] Urinish: {username}")

    # 1. Userni bazadan topadi
    user = db.query(User).filter(
        User.username == username,
        User.is_active == True
    ).first()

    if not user:
        print(f"[LOGIN] Topilmadi: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username yoki parol xato!"
        )

    # 2. Parolni tekshiradi
    if not verify_password(password, user.password):
        print(f"[LOGIN] Parol xato: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username yoki parol xato!"
        )

    # 3. Token yaratadi
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role.value,
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    print(f"[LOGIN] Muvaffaqiyatli: {username} | Role: {user.role.value}")

    # 4. Frontendga qaytariladi
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
    }
