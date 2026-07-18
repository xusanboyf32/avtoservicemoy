from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.category import Category
from app.schemas.category import CategoryCreateSchema, CategoryUpdateSchema


def create_category(db: Session, data: CategoryCreateSchema) -> Category:

    print(f"[CATEGORY] Yangi kategoriya: {data.name}")

    existing = db.query(Category).filter(
        Category.name == data.name
    ).first()

    if existing:
        print(f"[CATEGORY] Allaqachon mavjud: {data.name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu kategoriya allaqachon mavjud!"
        )

    category = Category(name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)

    print(f"[CATEGORY] Yaratildi: {category.name} | ID: {category.id}")

    return category


def get_categories(db: Session) -> list:

    print(f"[CATEGORY] Ro'yxat so'raldi")

    categories = db.query(Category).filter(
        Category.is_active == True
    ).all()

    print(f"[CATEGORY] Topildi: {len(categories)} ta")

    return categories


def get_category(db: Session, category_id: int) -> Category:

    print(f"[CATEGORY] So'raldi: ID {category_id}")

    category = db.query(Category).filter(
        Category.id == category_id,
        Category.is_active == True
    ).first()

    if not category:
        print(f"[CATEGORY] Topilmadi: ID {category_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kategoriya topilmadi!"
        )

    return category


def update_category(db: Session, category_id: int, data: CategoryUpdateSchema) -> Category:

    print(f"[CATEGORY] Yangilash: ID {category_id}")

    category = get_category(db, category_id)

    if data.name:
        category.name = data.name

    db.commit()
    db.refresh(category)

    print(f"[CATEGORY] Yangilandi: {category.name}")

    return category


def delete_category(db: Session, category_id: int) -> dict:

    print(f"[CATEGORY] O'chirish: ID {category_id}")

    category = get_category(db, category_id)
    category.is_active = False
    db.commit()

    print(f"[CATEGORY] O'chirildi: {category.name}")

    return {"message": f"{category.name} o'chirildi!"}
