from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from app.models.warehouse_transfer import WarehouseTransfer, TransferItem, TransferStatus
from app.models.warehouse_stock import WarehouseStock
from app.models.kassa_stock import KassaStock
from app.models.batch import Batch
from app.models.users import User, RoleEnum
from app.schemas.warehouse_transfer import WarehouseTransferCreateSchema





def create_transfer(
    db: Session,
    data: WarehouseTransferCreateSchema,
    current_user: User
) -> WarehouseTransfer:
    """Yangi transfer GURUHI — savat (ko'p mahsulot), bitta kassirga"""

    print(f"[TRANSFER] Yangi guruh: kassir_id={data.kassir_id} | {len(data.items)} ta mahsulot")

    if not data.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kamida bitta mahsulot kerak!")

    # Har item uchun ombor yetarliligini tekshir
    for it in data.items:
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == it.batch_id).first()
        if not ws:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Omborda topilmadi (batch {it.batch_id})!")
        if ws.quantity < it.sent_quantity:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Omborda yetarli emas! Mavjud: {ws.quantity} ta (batch {it.batch_id})")

    # Guruh yaratiladi
    transfer = WarehouseTransfer(
        status=TransferStatus.yuborildi,
        sent_by=current_user.id,
        kassir_id=data.kassir_id,
        note=data.note,
    )
    db.add(transfer)
    db.flush()   # transfer.id olish uchun

    # Itemlar + ombor kamayadi
    for it in data.items:
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == it.batch_id).first()
        ws.quantity -= it.sent_quantity

        item = TransferItem(
            transfer_id=transfer.id,
            batch_id=it.batch_id,
            sent_quantity=it.sent_quantity,
        )
        db.add(item)
        print(f"[TRANSFER]   batch {it.batch_id}: -{it.sent_quantity} (ombor: {ws.quantity})")

    db.commit()
    db.refresh(transfer)

    print(f"[TRANSFER] Guruh yuborildi: ID {transfer.id}")

    return transfer






def confirm_transfer(
    db: Session,
    transfer_id: int,
    current_user: User
) -> WarehouseTransfer:
    """Butun guruhni qabul qilish — hamma mahsulot kassaga qo'shiladi"""

    print(f"[TRANSFER] Guruh tasdiqlash: ID {transfer_id}")

    transfer = get_transfer(db, transfer_id)

    if transfer.status != TransferStatus.yuborildi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu transfer allaqachon tasdiqlangan yoki rad etilgan!")

    # Faqat belgilangan kassir qabul qila oladi (admin/superadmin har doim)
    if transfer.kassir_id and current_user.role == RoleEnum.kassir and transfer.kassir_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu transfer boshqa kassirga yuborilgan!")

    # Har item kassa stockga qo'shiladi
    for item in transfer.items:
        confirmed = item.sent_quantity
        ks = db.query(KassaStock).filter(KassaStock.batch_id == item.batch_id).first()
        if ks:
            ks.quantity += confirmed
        else:
            ks = KassaStock(batch_id=item.batch_id, quantity=confirmed)
            db.add(ks)
        item.confirmed_quantity = confirmed
        print(f"[TRANSFER]   batch {item.batch_id}: +{confirmed} kassaga")

    transfer.confirmed_by = current_user.id
    transfer.status = TransferStatus.qabul
    db.commit()
    db.refresh(transfer)
    print(f"[TRANSFER] Guruh qabul qilindi: ID {transfer_id}")
    return transfer


def reject_transfer(
    db: Session,
    transfer_id: int,
    current_user: User
) -> WarehouseTransfer:
    """Guruhni rad etish — hamma mahsulot omborga qaytadi"""

    print(f"[TRANSFER] Guruh rad etish: ID {transfer_id}")

    transfer = get_transfer(db, transfer_id)

    if transfer.status != TransferStatus.yuborildi:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bu transfer allaqachon tasdiqlangan yoki rad etilgan!")

    if transfer.kassir_id and current_user.role == RoleEnum.kassir and transfer.kassir_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bu transfer boshqa kassirga yuborilgan!")

    # Hamma item omborga qaytadi
    for item in transfer.items:
        ws = db.query(WarehouseStock).filter(WarehouseStock.batch_id == item.batch_id).first()
        if ws:
            ws.quantity += item.sent_quantity
        print(f"[TRANSFER]   batch {item.batch_id}: +{item.sent_quantity} omborga qaytdi")

    transfer.status = TransferStatus.rad
    transfer.confirmed_by = current_user.id
    db.commit()
    db.refresh(transfer)
    print(f"[TRANSFER] Guruh rad etildi: ID {transfer_id}")
    return transfer


def get_transfers(db: Session, status_filter: TransferStatus = None, kassir_id: int = None) -> list:
    """Transfer guruhlari ro'yxati (itemlari bilan)"""

    print(f"[TRANSFER] Ro'yxat | Status: {status_filter} | Kassir: {kassir_id}")

    query = db.query(WarehouseTransfer).filter(WarehouseTransfer.is_active == True)

    if status_filter:
        query = query.filter(WarehouseTransfer.status == status_filter)
    if kassir_id:
        query = query.filter(WarehouseTransfer.kassir_id == kassir_id)

    transfers = (
        query
        .options(
            joinedload(WarehouseTransfer.items).joinedload(TransferItem.batch).joinedload(Batch.product),
            joinedload(WarehouseTransfer.sender),
            joinedload(WarehouseTransfer.confirmer),
            joinedload(WarehouseTransfer.kassir),
        )
        .order_by(WarehouseTransfer.id.desc())
        .all()
    )

    print(f"[TRANSFER] Topildi: {len(transfers)} ta guruh")
    return transfers


def get_transfer(db: Session, transfer_id: int) -> WarehouseTransfer:
    transfer = db.query(WarehouseTransfer).filter(
        WarehouseTransfer.id == transfer_id,
        WarehouseTransfer.is_active == True
    ).first()
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer topilmadi!")
    return transfer
