from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.schemas.oil_record import OilRecordCreateSchema, OilRecordUpdateSchema, OilRecordResponseSchema
from app.core.dependencies import require_roles
from app.models.users import RoleEnum
from app.services.oil_record import create_oil_record, get_oil_records, get_oil_record, get_last_oil_record, update_oil_record, delete_oil_record, get_operator_tasks, update_call_status
from app.schemas.pagination import PaginatedResponse


router = APIRouter(prefix="/oil-records", tags=["Probeg daftarchasi"])


@router.get("/client/{client_id}", response_model=PaginatedResponse[OilRecordResponseSchema])
def list_oil_records(
    client_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.operator
    ))
):
    """Mijozning barcha moy yozuvlari — sahifalab qaytariladi"""
    return get_oil_records(db, client_id, page=page, page_size=page_size)


@router.get("/client/{client_id}/last", response_model=OilRecordResponseSchema)
def last_oil_record(
    client_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.operator
    ))
):
    """Mijozning oxirgi moy yozuvi"""
    from fastapi import HTTPException, status
    record = get_last_oil_record(db, client_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Yozuv topilmadi!")
    return record


# ══════════ OPERATOR — record_id dan OLDIN turishi SHART ══════════
@router.get("/operator/tasks")
def operator_tasks(
    filter_type: str = Query("yaqin"),
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.operator
    ))
):
    """Operator paneli: probegi kelgan mijozlar + statistika"""
    return get_operator_tasks(db, filter_type)


@router.patch("/operator/call/{record_id}")
def operator_call(
    record_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.operator
    ))
):
    """Qo'ng'iroq statusini yangilash"""
    return update_call_status(db, record_id, data, current_user.id)


# ══════════ record_id endpointlari — operator dan KEYIN ══════════
@router.get("/{record_id}", response_model=OilRecordResponseSchema)
def detail_oil_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.operator
    ))
):
    """Bitta yozuv"""
    return get_oil_record(db, record_id)


@router.post("/", response_model=OilRecordResponseSchema)
def add_oil_record(
    data: OilRecordCreateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.operator
    ))
):
    """Yangi moy yozuvi"""
    return create_oil_record(db, data)


@router.put("/{record_id}", response_model=OilRecordResponseSchema)
def edit_oil_record(
    record_id: int,
    data: OilRecordUpdateSchema,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin, RoleEnum.kassir, RoleEnum.operator
    ))
):
    """Yozuv yangilash"""
    return update_oil_record(db, record_id, data)


@router.delete("/{record_id}")
def remove_oil_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin, RoleEnum.admin
    ))
):
    """Yozuv o'chirish — admin va superadmin"""
    return delete_oil_record(db, record_id)