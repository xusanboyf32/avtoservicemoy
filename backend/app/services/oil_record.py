from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import date, datetime
from app.models.oil_record import OilRecord
from app.models.client import Client
from app.schemas.oil_record import OilRecordCreateSchema, OilRecordUpdateSchema
from app.services.client import get_client
from app.services.sync_service import sync_or_queue


def create_oil_record(db: Session, data: OilRecordCreateSchema) -> OilRecord:

    print(f"[OIL_RECORD] Yangi yozuv: client_id={data.client_id}")

    # Mijoz mavjudligini tekshirish
    client = get_client(db, data.client_id)

    oil_record = OilRecord(
        client_id=data.client_id,
        date=data.date or date.today(),
        oil_brand=data.oil_brand,
        oil_type=data.oil_type,
        mileage=data.mileage,
        transmission=data.transmission,
        next_date=data.next_date,
        oil_filter=data.oil_filter,
        salon_filter=data.salon_filter,
        spark_plug=data.spark_plug,
        air_filter=data.air_filter,
        fuel_filter=data.fuel_filter,
        pampers=data.pampers,
        master_name=data.master_name,
        master_phone=data.master_phone,
        note=data.note
    )
    db.add(oil_record)
    db.commit()
    db.refresh(oil_record)

    print(f"[OIL_RECORD] Yaratildi: ID {oil_record.id} | Client: {data.client_id}")

    # Sync — probeg serverga yuboriladi
    sync_or_queue(db, "oil_records", "create", {
        "exe_id": oil_record.id,
        "client_phone": client.phone,
        "date": str(oil_record.date),
        "oil_brand": oil_record.oil_brand,
        "oil_type": oil_record.oil_type,
        "mileage": oil_record.mileage,
        "next_date": str(oil_record.next_date) if oil_record.next_date else None,
        "transmission": oil_record.transmission,
        "oil_filter": oil_record.oil_filter,
        "air_filter": oil_record.air_filter,
        "salon_filter": oil_record.salon_filter,
        "spark_plug": oil_record.spark_plug,
        "fuel_filter": oil_record.fuel_filter,
        "pampers": oil_record.pampers,
        "master_name": oil_record.master_name,
        "note": oil_record.note
    })

    return oil_record


def get_oil_records(db: Session, client_id: int, page: int = 1, page_size: int = 50) -> dict:

    print(f"[OIL_RECORD] Ro'yxat: client_id={client_id} | Page: {page}")

    get_client(db, client_id)

    query = db.query(OilRecord).filter(
        OilRecord.client_id == client_id,
        OilRecord.is_active == True
    )

    total = query.count()

    records = query.order_by(OilRecord.date.desc()) \
                    .offset((page - 1) * page_size) \
                    .limit(page_size) \
                    .all()

    print(f"[OIL_RECORD] Topildi: {total} ta jami | {len(records)} ta shu sahifada")

    return {"total": total, "page": page, "page_size": page_size, "items": records}


def get_oil_record(db: Session, record_id: int) -> OilRecord:

    print(f"[OIL_RECORD] So'raldi: ID {record_id}")

    record = db.query(OilRecord).filter(
        OilRecord.id == record_id,
        OilRecord.is_active == True
    ).first()

    if not record:
        print(f"[OIL_RECORD] Topilmadi: ID {record_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Yozuv topilmadi!"
        )

    return record


def get_last_oil_record(db: Session, client_id: int) -> OilRecord:
    """Mijozning oxirgi moy yozuvini qaytaradi"""

    print(f"[OIL_RECORD] Oxirgi yozuv: client_id={client_id}")

    record = db.query(OilRecord).filter(
        OilRecord.client_id == client_id,
        OilRecord.is_active == True
    ).order_by(OilRecord.date.desc()).first()

    return record


def update_oil_record(db: Session, record_id: int, data: OilRecordUpdateSchema) -> OilRecord:

    print(f"[OIL_RECORD] Yangilash: ID {record_id}")

    record = get_oil_record(db, record_id)

    if data.date:
        record.date = data.date
    if data.oil_brand:
        record.oil_brand = data.oil_brand
    if data.oil_type:
        record.oil_type = data.oil_type
    if data.mileage:
        record.mileage = data.mileage
    if data.transmission:
        record.transmission = data.transmission
    if data.next_date:
        record.next_date = data.next_date
    if data.oil_filter is not None:
        record.oil_filter = data.oil_filter
    if data.salon_filter is not None:
        record.salon_filter = data.salon_filter
    if data.spark_plug is not None:
        record.spark_plug = data.spark_plug
    if data.air_filter is not None:
        record.air_filter = data.air_filter
    if data.fuel_filter is not None:
        record.fuel_filter = data.fuel_filter
    if data.pampers is not None:
        record.pampers = data.pampers
    if data.master_name:
        record.master_name = data.master_name
    if data.master_phone:
        record.master_phone = data.master_phone
    if data.note:
        record.note = data.note

    db.commit()
    db.refresh(record)

    print(f"[OIL_RECORD] Yangilandi: ID {record_id}")

    return record


def delete_oil_record(db: Session, record_id: int) -> dict:

    print(f"[OIL_RECORD] O'chirish: ID {record_id}")

    record = get_oil_record(db, record_id)
    record.is_active = False
    db.commit()

    print(f"[OIL_RECORD] O'chirildi: ID {record_id}")

    return {"message": "Yozuv o'chirildi!"}




def get_operator_tasks(db: Session, filter_type: str = "yaqin") -> dict:
    """
    Operator paneli: probeg bo'yicha mijozlar + statistika.
    Har mijozning OXIRGI probeg yozuvi olinadi.
    filter_type: yaqin / chiqildi / chiqolmadik / hammasi
    """
    print(f"[OPERATOR] Vazifalar so'raldi: filter={filter_type}")

    today = date.today()

    # Har mijozning oxirgi (eng yangi) probeg yozuvi
    all_records = db.query(OilRecord).filter(
        OilRecord.is_active == True,
        OilRecord.next_date != None,
    ).order_by(OilRecord.date.desc()).all()

    seen = set()
    last_records = []
    for r in all_records:
        if r.client_id in seen:
            continue
        seen.add(r.client_id)
        last_records.append(r)

    # Statistika
    stats = {"yaqin": 0, "chiqildi": 0, "chiqolmadik": 0, "hammasi": len(last_records)}
    for r in last_records:
        days = (r.next_date - today).days
        st = r.call_status or "kutilmoqda"
        # Yaqin: 20 kun ichida yoki o'tib ketgan, hal qilinmagan, hali gaplashilmagan
        if days <= 20 and st in ("kutilmoqda",):
            stats["yaqin"] += 1
        if st == "gaplashildi":
            stats["chiqildi"] += 1
        if st == "kotarmadi":
            stats["chiqolmadik"] += 1

    # Filter
    if filter_type == "yaqin":
        filtered = [r for r in last_records
                    if (r.next_date - today).days <= 20
                    and (r.call_status or "kutilmoqda") == "kutilmoqda"]
    elif filter_type == "chiqildi":
        filtered = [r for r in last_records
                    if (r.call_status in ("gaplashildi"))]
    elif filter_type == "chiqolmadik":
        filtered = [r for r in last_records if r.call_status == "kotarmadi"]
    else:  # hammasi
        filtered = last_records

    # Eng yaqin sana birinchi
    filtered.sort(key=lambda r: r.next_date)

    result = []
    for r in filtered:
        client = db.query(Client).filter(Client.id == r.client_id).first()
        result.append({
            "oil_record_id": r.id,
            "client_id": r.client_id,
            "full_name": client.full_name if client else "?",
            "phone": client.phone if client else None,
            "car_number": client.car_number if client else None,
            "car_model": client.car_model if client else None,
            "jami_qarz": client.jami_qarz if client else 0,
            "next_date": str(r.next_date),
            "days_left": (r.next_date - today).days,
            "mileage": r.mileage,
            "call_status": r.call_status or "kutilmoqda",
            "call_note": r.call_note,
            "call_time": r.call_time,
        })

    print(f"[OPERATOR] Topildi: {len(result)} ta | {stats}")
    return {"stats": stats, "items": result}




def update_call_status(db: Session, record_id: int, data: dict, operator_id: int) -> OilRecord:
    """
    Operator qo'ng'iroq statusini yangilaydi.
    data: {call_status, call_note, remind_date}
    """
    print(f"[OPERATOR] Status yangilash: record={record_id} | {data.get('call_status')}")

    record = get_oil_record(db, record_id)

    if data.get("call_status"):
        record.call_status = data["call_status"]
    if data.get("call_note") is not None:
        record.call_note = data["call_note"]
    if data.get("remind_date"):
        record.remind_date = data["remind_date"]

    record.call_operator_id = operator_id
    record.call_time = datetime.now().strftime("%Y-%m-%d %H:%M")

    db.commit()
    db.refresh(record)

    print(f"[OPERATOR] Yangilandi: record={record_id} | status={record.call_status}")

    return record


