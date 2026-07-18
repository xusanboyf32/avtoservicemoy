from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.kassa_page import KassaPage
from app.schemas.kassa_page import KassaPageUpdateSchema


def get_all_pages(db: Session) -> list:

    print(f"[KASSA_PAGE] Barcha pagelar so'raldi")

    pages = db.query(KassaPage).order_by(KassaPage.page_number.asc()).all()

    print(f"[KASSA_PAGE] Topildi: {len(pages)} ta page")

    return pages


def get_page(db: Session, page_number: int) -> KassaPage:

    print(f"[KASSA_PAGE] So'raldi: page={page_number}")

    page = db.query(KassaPage).filter(
        KassaPage.page_number == page_number
    ).first()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Page {page_number} topilmadi!"
        )

    return page


def update_page(
    db: Session,
    page_number: int,
    data: KassaPageUpdateSchema
) -> KassaPage:

    print(f"[KASSA_PAGE] Yangilash: page={page_number}")

    page = get_page(db, page_number)

    if data.client_id is not None:
        page.client_id = data.client_id

    if data.items is not None:
        page.items = [item.model_dump() for item in data.items]

    if data.status is not None:
        page.status = data.status

    # Savatcha bo'sh bo'lsa → page bo'sh
    if data.items is not None and len(data.items) == 0:
        page.status = "bosh"
        page.client_id = None
    elif data.items is not None and len(data.items) > 0:
        page.status = "band"

    db.commit()
    db.refresh(page)

    print(f"[KASSA_PAGE] Yangilandi: page={page_number} | status={page.status}")

    return page


def clear_page(db: Session, page_number: int) -> KassaPage:
    """Pageni tozalash — savat bo'shatiladi"""

    print(f"[KASSA_PAGE] Tozalash: page={page_number}")

    page = get_page(db, page_number)
    page.items = []
    page.status = "bosh"
    page.client_id = None

    db.commit()
    db.refresh(page)

    print(f"[KASSA_PAGE] Tozalandi: page={page_number}")

    return page


def get_empty_page(db: Session) -> KassaPage:
    """Bo'sh page topish — kamera yangi mijoz topganda"""

    print(f"[KASSA_PAGE] Bo'sh page qidirilmoqda")

    page = db.query(KassaPage).filter(
        KassaPage.status == "bosh"
    ).order_by(KassaPage.page_number.asc()).first()

    if not page:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barcha pagelar band!"
        )

    print(f"[KASSA_PAGE] Bo'sh page topildi: page={page.page_number}")

    return page


