from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.unit import Unit
from app.schemas.unit import UnitCreateSchema, UnitUpdateSchema


def create_unit(db: Session, data: UnitCreateSchema) -> Unit:

    print(f"[UNIT] Yangi o'lchov birligi: {data.name}")

    existing = db.query(Unit).filter(
        Unit.name == data.name
    ).first()

    if existing:
        print(f"[UNIT] Allaqachon mavjud: {data.name}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu o'lchov birligi allaqachon mavjud!"
        )

    unit = Unit(name=data.name)
    db.add(unit)
    db.commit()
    db.refresh(unit)

    print(f"[UNIT] Yaratildi: {unit.name} | ID: {unit.id}")

    return unit


def get_units(db: Session) -> list:

    print(f"[UNIT] Ro'yxat so'raldi")

    units = db.query(Unit).filter(
        Unit.is_active == True
    ).all()

    print(f"[UNIT] Topildi: {len(units)} ta")

    return units


def get_unit(db: Session, unit_id: int) -> Unit:

    print(f"[UNIT] So'raldi: ID {unit_id}")

    unit = db.query(Unit).filter(
        Unit.id == unit_id,
        Unit.is_active == True
    ).first()

    if not unit:
        print(f"[UNIT] Topilmadi: ID {unit_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="O'lchov birligi topilmadi!"
        )

    return unit


def update_unit(db: Session, unit_id: int, data: UnitUpdateSchema) -> Unit:

    print(f"[UNIT] Yangilash: ID {unit_id}")

    unit = get_unit(db, unit_id)

    if data.name:
        unit.name = data.name

    db.commit()
    db.refresh(unit)

    print(f"[UNIT] Yangilandi: {unit.name}")

    return unit


def delete_unit(db: Session, unit_id: int) -> dict:

    print(f"[UNIT] O'chirish: ID {unit_id}")

    unit = get_unit(db, unit_id)
    unit.is_active = False
    db.commit()

    print(f"[UNIT] O'chirildi: {unit.name}")

    return {"message": f"{unit.name} o'chirildi!"}

