from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.brand import Brand
from app.schemas.brand import BrandCreateSchema, BrandUpdateSchema


def create_brand(db: Session, data: BrandCreateSchema) -> Brand:

    print(f"[BRAND] Yangi brand: {data.name}")

    existing = db.query(Brand).filter(
        Brand.name == data.name
    ).first()

    if existing:
        print(f"[BRAND] Allaqachon mavjud: {data.name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu brand allaqachon mavjud!"
        )

    brand = Brand(name=data.name)
    db.add(brand)
    db.commit()
    db.refresh(brand)

    print(f"[BRAND] Yaratildi: {brand.name} | ID: {brand.id}")

    return brand


def get_brands(db: Session) -> list:

    print(f"[BRAND] Ro'yxat so'raldi")

    brands = db.query(Brand).filter(
        Brand.is_active == True
    ).all()

    print(f"[BRAND] Topildi: {len(brands)} ta")

    return brands


def get_brand(db: Session, brand_id: int) -> Brand:

    print(f"[BRAND] So'raldi: ID {brand_id}")

    brand = db.query(Brand).filter(
        Brand.id == brand_id,
        Brand.is_active == True
    ).first()

    if not brand:
        print(f"[BRAND] Topilmadi: ID {brand_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand topilmadi!"
        )

    return brand


def update_brand(db: Session, brand_id: int, data: BrandUpdateSchema) -> Brand:

    print(f"[BRAND] Yangilash: ID {brand_id}")

    brand = get_brand(db, brand_id)

    if data.name:
        brand.name = data.name

    db.commit()
    db.refresh(brand)

    print(f"[BRAND] Yangilandi: {brand.name}")

    return brand


def delete_brand(db: Session, brand_id: int) -> dict:

    print(f"[BRAND] O'chirish: ID {brand_id}")

    brand = get_brand(db, brand_id)
    brand.is_active = False
    db.commit()

    print(f"[BRAND] O'chirildi: {brand.name}")

    return {"message": f"{brand.name} o'chirildi!"}

