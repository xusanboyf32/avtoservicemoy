from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.client import Client
from app.schemas.client import ClientCreateSchema, ClientUpdateSchema
from app.services.sync_service import sync_or_queue
from app.models.oil_record import OilRecord


def create_client(db: Session, data: ClientCreateSchema) -> Client:

    print(f"[CLIENT] Yangi mijoz: {data.full_name}")

    client = Client(
        full_name=data.full_name,
        phone=data.phone,
        car_number=data.car_number,
        car_model=data.car_model
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    print(f"[CLIENT] Yaratildi: {client.full_name} | ID: {client.id}")

    # Sync — mijoz serverga yuboriladi
    sync_or_queue(db, "clients", "create", {
        "exe_id": client.id,
        "full_name": client.full_name,
        "phone": client.phone,           # ← server kalit maydoni
        "car_number": client.car_number,
        "car_model": client.car_model,
        "created_at": client.created_at.isoformat() if client.created_at else None
    })

    return client


def get_clients(db: Session, search: str = None, page: int = 1, page_size: int = 50) -> dict:

    print(f"[CLIENT] Ro'yxat so'raldi | Search: {search} | Page: {page}")

    query = db.query(Client).filter(Client.is_active == True)

    if search:
        query = query.filter(
            (Client.full_name.ilike(f"%{search}%")) |
            (Client.phone.ilike(f"%{search}%")) |
            (Client.car_number.ilike(f"%{search}%"))
        )

    total = query.count()


    clients = query.order_by(Client.id.desc()) \
        .offset((page - 1) * page_size) \
        .limit(page_size) \
        .all()

    # Har mijoz uchun oxirgi probeg sanasini qo'shish
    result = []
    for c in clients:
        last_oil = db.query(OilRecord).filter(
            OilRecord.client_id == c.id,
            OilRecord.is_active == True
        ).order_by(OilRecord.date.desc()).first()

        c_dict = {
            "id": c.id,
            "full_name": c.full_name,
            "phone": c.phone,
            "car_number": c.car_number,
            "car_model": c.car_model,
            "jami_qarz": c.jami_qarz,
            "note": c.note if hasattr(c, 'note') else None,
            "is_active": c.is_active,
            "last_oil_date": str(last_oil.date) if last_oil and last_oil.date else None,
            "next_oil_date": str(last_oil.next_date) if last_oil and last_oil.next_date else None,
        }
        result.append(c_dict)

    print(f"[CLIENT] Topildi: {total} ta jami | {len(clients)} ta shu sahifada")

    return {"total": total, "page": page, "page_size": page_size, "items": result}


def get_client(db: Session, client_id: int) -> Client:

    print(f"[CLIENT] So'raldi: ID {client_id}")

    client = db.query(Client).filter(
        Client.id == client_id,
        Client.is_active == True
    ).first()

    if not client:
        print(f"[CLIENT] Topilmadi: ID {client_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mijoz topilmadi!"
        )

    return client


def get_client_by_car_number(db: Session, car_number: str) -> Client:
    """Kamera orqali mashina raqami bo'yicha mijoz topish"""

    print(f"[CLIENT] Mashina raqami bo'yicha qidiruv: {car_number}")

    client = db.query(Client).filter(
        Client.car_number == car_number,
        Client.is_active == True
    ).first()

    return client


def update_client(db: Session, client_id: int, data: ClientUpdateSchema) -> Client:

    print(f"[CLIENT] Yangilash: ID {client_id}")

    client = get_client(db, client_id)

    if data.full_name:
        client.full_name = data.full_name
    if data.phone:
        client.phone = data.phone
    if data.car_number:
        client.car_number = data.car_number
    if data.car_model:
        client.car_model = data.car_model

    db.commit()
    db.refresh(client)

    print(f"[CLIENT] Yangilandi: {client.full_name}")

    # Sync — mijoz yangilanishi serverga yuboriladi
    sync_or_queue(db, "clients", "update", {
        "exe_id": client.id,
        "phone": client.phone,           # ← server kalit maydoni
        "full_name": client.full_name,
        "car_number": client.car_number,
        "car_model": client.car_model
    })

    return client


def delete_client(db: Session, client_id: int) -> dict:

    print(f"[CLIENT] O'chirish: ID {client_id}")

    client = get_client(db, client_id)
    client.is_active = False
    db.commit()

    print(f"[CLIENT] O'chirildi: {client.full_name}")

    return {"message": f"{client.full_name} o'chirildi!"}
