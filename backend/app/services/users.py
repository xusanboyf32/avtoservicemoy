from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User, Profile, Permission, RoleEnum
from app.core.security import hash_password
from app.core.permissions import ROLE_DEFAULT_PERMISSIONS
from app.schemas.users import UserCreateSchema, UserUpdateSchema


# ================================================
# USER YARATISH
# ================================================

def create_user(db: Session, data: UserCreateSchema, current_user: User = None) -> User:

    print(f"[USER] Yangi user yaratish: {data.username} | Role: {data.role}")

    # Admin superadmin yoki admin yarata olmaydi
    if current_user and current_user.role == RoleEnum.admin:
        if data.role in (RoleEnum.superadmin, RoleEnum.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin superadmin yoki admin yarata olmaydi!"
            )


    # 1. Username band ekanligini tekshirish
    existing = db.query(User).filter(
        User.username == data.username
    ).first()

    if existing:
        print(f"[USER] Username band: {data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu username allaqachon band!"
        )

    # 2. User yaratish
    user = User(
        username=data.username,
        password=hash_password(data.password),
        role=data.role
    )
    db.add(user)
    db.flush()  # user.id olish uchun

    print(f"[USER] User yaratildi: {user.username} | ID: {user.id}")

    # 3. Profile yaratish (kassirdan tashqari)
    if data.role != RoleEnum.kassir:
        if not data.full_name:
            print(f"[USER] full_name yo'q: {data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu rol uchun full_name majburiy!"
            )
        profile = Profile(
            user_id=user.id,
            full_name=data.full_name,
            phone=data.phone,
            position=data.position
        )
        db.add(profile)
        print(f"[USER] Profile yaratildi: {data.full_name}")

    # 4. Permission avtomatik yaratish
    default_perms = ROLE_DEFAULT_PERMISSIONS.get(data.role, {})
    permission = Permission(
        user_id=user.id,
        **default_perms
    )
    db.add(permission)

    print(f"[USER] Permission yaratildi: {data.role.value}")

    # Kontragent role bo'lsa → kontragent jadvali yaratiladi
    if data.role == RoleEnum.kontragent:
        from app.models.kontragent import Kontragent
        kontragent = Kontragent(
            name=data.full_name or data.username,
            phone=data.phone,
            user_id=user.id
        )
        db.add(kontragent)
        print(f"[USER] Kontragent yaratildi: {kontragent.name}")

    db.commit()
    db.refresh(user)
    print(f"[USER] Muvaffaqiyatli yaratildi: {user.username}")
    return user



# ================================================
# USER RO'YXATI
# ================================================

def get_users(db: Session) -> list:

    print(f"[USER] Barcha userlar so'raldi")

    users = db.query(User).filter(
        User.is_active == True
    ).all()

    print(f"[USER] Topildi: {len(users)} ta user")

    return users


# ================================================
# BITTA USER
# ================================================

def get_user(db: Session, user_id: int) -> User:

    print(f"[USER] User so'raldi: ID {user_id}")

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True
    ).first()

    if not user:
        print(f"[USER] Topilmadi: ID {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User topilmadi!"
        )

    print(f"[USER] Topildi: {user.username}")

    return user


# ================================================
# USER YANGILASH
# ================================================

def update_user(db: Session, user_id: int, data: UserUpdateSchema, current_user: User = None) -> User:

    print(f"[USER] Yangilash: ID {user_id}")

    user = get_user(db, user_id)

    if current_user:
        # Superadmin — boshqa superadminni tahrirlay olmaydi (o'zini tahrirlashi mumkin)
        if user.role == RoleEnum.superadmin and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Boshqa superadminni tahrirlab bo'lmaydi!"
            )
        # Admin — superadmin yoki boshqa adminni tahrirlay olmaydi
        if current_user.role == RoleEnum.admin and user.role in (RoleEnum.superadmin, RoleEnum.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin superadmin yoki adminni tahrirlay olmaydi!"
            )


    # Username o'zgarsa band emasligini tekshirish
    if data.username and data.username != user.username:
        existing = db.query(User).filter(
            User.username == data.username
        ).first()
        if existing:
            print(f"[USER] Username band: {data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu username allaqachon band!"
            )
        user.username = data.username
        print(f"[USER] Username yangilandi: {data.username}")

    # Parol o'zgarsa hash qilish
    if data.password:
        user.password = hash_password(data.password)
        print(f"[USER] Parol yangilandi: {user.username}")

    # Profile yangilash (kassirdan tashqari)
    if user.role != RoleEnum.kassir and user.profile:
        if data.full_name:
            user.profile.full_name = data.full_name
        if data.phone:
            user.profile.phone = data.phone
        if data.position:
            user.profile.position = data.position
        print(f"[USER] Profile yangilandi: {user.username}")

    db.commit()
    db.refresh(user)

    print(f"[USER] Muvaffaqiyatli yangilandi: {user.username}")

    return user


# ================================================
# USER O'CHIRISH (is_active = False)
# ================================================

def delete_user(db: Session, user_id: int, current_user: User = None) -> dict:

    print(f"[USER] O'chirish: ID {user_id}")

    user = get_user(db, user_id)

    # Superadmin hech qachon o'chirilmasin (kim so'ragan bo'lishidan qat'iy nazar)
    if user.role == RoleEnum.superadmin:
        print(f"[USER] Superadmin o'chirishga urinish: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin o'chirib bo'lmaydi!"
        )

    # Admin — boshqa adminni o'chira olmaydi
    if current_user and current_user.role == RoleEnum.admin and user.role == RoleEnum.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin boshqa adminni o'chira olmaydi!"
        )

    user.is_active = False
    db.commit()

    print(f"[USER] O'chirildi: {user.username}")

    return {"message": f"{user.username} o'chirildi!"}

# ================================================
# USER PERMISSION YANGILASH
# ================================================

def update_permission(db: Session, user_id: int, perms: dict, current_user: User = None) -> Permission:

    print(f"[PERMISSION] Yangilash: ID {user_id}")

    user = get_user(db, user_id)

    if current_user:
        if user.role == RoleEnum.superadmin and user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Boshqa superadmin ruxsatlarini o'zgartirib bo'lmaydi!"
            )
        if current_user.role == RoleEnum.admin and user.role in (RoleEnum.superadmin, RoleEnum.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin superadmin yoki admin ruxsatlarini o'zgartira olmaydi!"
            )

    if not user.permission:
        print(f"[PERMISSION] Permission topilmadi: ID {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission topilmadi!"
        )

    for key, value in perms.items():
        if hasattr(user.permission, key):
            setattr(user.permission, key, value)

    db.commit()
    db.refresh(user.permission)

    print(f"[PERMISSION] Muvaffaqiyatli yangilandi: {user.username}")

    return user.permission

