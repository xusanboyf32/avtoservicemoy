from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.product import ProductCreateSchema, ProductUpdateSchema, ProductResponseSchema
from app.schemas.pagination import PaginatedResponse
from app.services.product import create_product, get_products, get_product, update_product, delete_product
from app.core.dependencies import require_roles
from app.models.users import RoleEnum
from app.models.product import Product
from typing import Optional
import os
import shutil

router = APIRouter(prefix="/products", tags=["Mahsulotlar"])

# Rasmlar shu papkaga saqlanadi
UPLOAD_DIR = "app/static/products"
os.makedirs(UPLOAD_DIR, exist_ok=True)



@router.get("/", response_model=PaginatedResponse[ProductResponseSchema])
def list_products(
    search: Optional[str] = Query(None, description="Nom, ID yoki shtrix kod bo'yicha qidirish"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi,
        RoleEnum.operator
    ))
):
    """Barcha mahsulotlar — sahifalab qaytariladi"""
    return get_products(db, search, page=page, page_size=page_size)






@router.get("/{product_id}", response_model=ProductResponseSchema)
def detail_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir,
        RoleEnum.skladchi
    ))
):
    """Bitta mahsulot — admin, superadmin, kassir, skladchi"""
    return get_product(db, product_id)


@router.post("/", response_model=ProductResponseSchema)
def add_product(
    data: ProductCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.skladchi
    ))
):
    """Yangi mahsulot — admin va superadmin"""
    return create_product(db, data)


@router.put("/{product_id}", response_model=ProductResponseSchema)
def edit_product(
    product_id: int,
    data: ProductUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulot yangilash — admin va superadmin"""
    return update_product(db, product_id, data)


@router.delete("/{product_id}")
def remove_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulot o'chirish — admin va superadmin"""
    return delete_product(db, product_id)







@router.post("/{product_id}/image", response_model=ProductResponseSchema)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin
    ))
):
    """Mahsulotga rasm yuklash — mijoz sahifasi uchun"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(404, "Mahsulot topilmadi")

    # Fayl kengaytmasi
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(400, "Faqat rasm (jpg, png, webp) yuklash mumkin")

    filename = f"{product_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Eski rasmlarni (boshqa kengaytmali) tozalash
    for old_ext in [".jpg", ".jpeg", ".png", ".webp"]:
        old = os.path.join(UPLOAD_DIR, f"{product_id}{old_ext}")
        if os.path.exists(old) and old != filepath:
            os.remove(old)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    product.image_url = f"/static/products/{filename}"
    db.commit()
    db.refresh(product)
    return product





