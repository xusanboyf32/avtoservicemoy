from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.product import Product
from app.schemas.product import ProductCreateSchema, ProductUpdateSchema
from app.services.category import get_category
from app.services.unit import get_unit


def create_product(db: Session, data: ProductCreateSchema) -> Product:

    print(f"[PRODUCT] Yangi mahsulot: {data.name}")

    # Kategoriya mavjudligini tekshirish
    get_category(db, data.category_id)

    # O'lchov birligi mavjudligini tekshirish
    get_unit(db, data.unit_id)

    # Shtrix kod band emasligini tekshirish
    if data.barcode:
        existing = db.query(Product).filter(
            Product.barcode == data.barcode
        ).first()
        if existing:
            print(f"[PRODUCT] Shtrix kod band: {data.barcode}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu shtrix kod allaqachon mavjud!"
            )

    product = Product(
        name=data.name,
        category_id=data.category_id,
        unit_id=data.unit_id,
        barcode=data.barcode,
        description=data.description
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    print(f"[PRODUCT] Yaratildi: {product.name} | ID: {product.id}")

    return product





def get_products(
    db: Session,
    search: str = None,
    page: int = 1,
    page_size: int = 50
) -> dict:

    print(f"[PRODUCT] Ro'yxat so'raldi | Search: {search} | Page: {page}")

    query = db.query(Product).filter(Product.is_active == True)

    # Search: nom, shtrix kod, ID bo'yicha
    if search:
        if search.isdigit():
            query = query.filter(
                (Product.id == int(search)) |
                (Product.barcode == search)
            )
        else:
            query = query.filter(
                Product.name.ilike(f"%{search}%")
            )

    total = query.count()

    products = query.order_by(Product.id.desc()) \
                     .offset((page - 1) * page_size) \
                     .limit(page_size) \
                     .all()

    print(f"[PRODUCT] Topildi: {total} ta jami | {len(products)} ta shu sahifada")

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": products
    }

#
# def get_products(db: Session, search: str = None) -> list:
#
#     print(f"[PRODUCT] Ro'yxat so'raldi | Search: {search}")
#
#     query = db.query(Product).filter(Product.is_active == True)
#
#     # Search: nom, shtrix kod, ID bo'yicha
#     if search:
#         if search.isdigit():
#             query = query.filter(
#                 (Product.id == int(search)) |
#                 (Product.barcode == search)
#             )
#         else:
#             query = query.filter(
#                 Product.name.ilike(f"%{search}%")
#             )
#
#     products = query.all()
#
#     print(f"[PRODUCT] Topildi: {len(products)} ta")
#
#     return products
#









def get_product(db: Session, product_id: int) -> Product:

    print(f"[PRODUCT] So'raldi: ID {product_id}")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.is_active == True
    ).first()

    if not product:
        print(f"[PRODUCT] Topilmadi: ID {product_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mahsulot topilmadi!"
        )

    return product


def update_product(db: Session, product_id: int, data: ProductUpdateSchema) -> Product:

    print(f"[PRODUCT] Yangilash: ID {product_id}")

    product = get_product(db, product_id)

    if data.name:
        product.name = data.name
    if data.category_id:
        get_category(db, data.category_id)
        product.category_id = data.category_id
    if data.unit_id:
        get_unit(db, data.unit_id)
        product.unit_id = data.unit_id
    if data.barcode:
        existing = db.query(Product).filter(
            Product.barcode == data.barcode,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu shtrix kod allaqachon mavjud!"
            )
        product.barcode = data.barcode
    if data.description:
        product.description = data.description

    db.commit()
    db.refresh(product)

    print(f"[PRODUCT] Yangilandi: {product.name}")

    return product


def delete_product(db: Session, product_id: int) -> dict:

    print(f"[PRODUCT] O'chirish: ID {product_id}")

    product = get_product(db, product_id)
    product.is_active = False
    db.commit()

    print(f"[PRODUCT] O'chirildi: {product.name}")

    return {"message": f"{product.name} o'chirildi!"}

