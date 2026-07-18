from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.services.camera_client import (
    get_plates_from_camera,
    get_camera_health,
    control_camera
)
from app.services.client import get_client_by_car_number
from app.core.dependencies import require_roles
from app.models.users import RoleEnum

router = APIRouter(prefix="/camera", tags=["Kamera"])


@router.get("/status")
def camera_status(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Kamera ulangan/uzilganini tekshirish — frontend indikator uchun"""
    return get_camera_health()


@router.get("/plates")
def get_plates(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """
    Frontend har 2-3 sekundda so'raydi (polling).
    Yangi raqam + bazadan mijoz birga qaytadi.
    """
    plates = get_plates_from_camera()
    if not plates:
        return []

    result = []
    for item in plates:
        plate = item.get("plate")
        if not plate:
            continue
        client = get_client_by_car_number(db, plate)
        result.append({
            "plate":  plate,
            "time":   item.get("time"),
            "camera": item.get("camera"),
            "name":   item.get("name"),
            "client": {
                "id":         client.id,
                "full_name":  client.full_name,
                "phone":      client.phone,
                "car_number": client.car_number,
                "car_model":  client.car_model,
                "jami_qarz":  client.jami_qarz,
            } if client else None
        })
    return result


@router.post("/{cam_id}/start")
def start_cam(
    cam_id: str,
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Kamerani yoqish"""
    if cam_id not in ("cam1", "cam2"):
        return {"ok": False, "error": "Noto'g'ri kamera ID"}
    return control_camera(cam_id, "start")


@router.post("/{cam_id}/stop")
def stop_cam(
    cam_id: str,
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Kamerani o'chirish"""
    if cam_id not in ("cam1", "cam2"):
        return {"ok": False, "error": "Noto'g'ri kamera ID"}
    return control_camera(cam_id, "stop")


@router.post("/window/show")
def show_window(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Kamera oynasini ekranda ko'rsatish"""
    return control_camera("all", "show")


@router.post("/window/hide")
def hide_window(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Kamera oynasini ekrandan yashirish"""
    return control_camera("all", "hide")


@router.post("/window/split")
def split_window(
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Ekranni ikkiga bo'lish (split screen)"""
    return control_camera("all", "split")


@router.post("/window/full/{cam_id}")
def full_window(
    cam_id: str,
    current_user=Depends(require_roles(
        RoleEnum.superadmin,
        RoleEnum.admin,
        RoleEnum.kassir
    ))
):
    """Bitta kamerani to'liq ekranda ko'rsatish"""
    if cam_id not in ("cam1", "cam2"):
        return {"ok": False, "error": "Noto'g'ri kamera ID"}
    return control_camera(cam_id, "full")







# from fastapi import APIRouter, Depends
# from app.services.camera_client import get_plate_from_camera, get_camera_status
# from app.core.dependencies import require_roles
# from app.models.users import RoleEnum
#
# router = APIRouter(prefix="/camera", tags=["Kamera"])
#
#
# @router.get("/last-plate")
# def last_plate(
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.kassir
#     ))
# ):
#     """Frontend bu yerni har 3-5 sekundda so'rab turadi (polling)"""
#     result = get_plate_from_camera()
#     return result or {"plate": None, "time": None}
#
#
# @router.get("/status")
# def camera_status(
#     current_user=Depends(require_roles(
#         RoleEnum.superadmin,
#         RoleEnum.admin,
#         RoleEnum.kassir
#     ))
# ):
#     """Frontend kamera ulangan/uzilganini ko'rsatish uchun"""
#     return get_camera_status()
#
#