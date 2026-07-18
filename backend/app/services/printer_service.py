"""
Xprinter XP-D200N — Win32Raw (Windows printer nomi orqali)
python-escpos kutubxonasi ishlatiladi
"""
from datetime import datetime
from app.core.config import settings

PRINTER_NAME = settings.PRINTER_NAME
SHOP_NAME    = settings.SHOP_NAME
SHOP_SUB     = settings.SHOP_SUB
SHOP_ADDRESS = settings.SHOP_ADDRESS
SHOP_PHONE   = settings.SHOP_PHONE

W = 32  # 80mm qog'oz = 32 belgi


def get_printer():
    """Windows printer nomi orqali ulanadi — Vendor/Product ID kerak emas"""
    from escpos.printer import Win32Raw
    return Win32Raw(PRINTER_NAME)


def _line(char="-") -> str:
    return char * W + "\n"


def _row(left: str, right: str, width=W) -> str:
    """Chapga va o'ngga tekislangan bitta qator"""
    gap = width - len(left) - len(right)
    return f"{left}{' ' * max(1, gap)}{right}\n"


def print_receipt(sale, client=None, oil_record=None) -> dict:
    """
    Kassir sahifasida 'Chek chiqarish' bosilganda chaqiriladi.
    sale       → Sale modeli
    client     → Client modeli (agar mijoz bog'langan bo'lsa)
    oil_record → OilRecord modeli (agar probeg yozuvi bo'lsa)
    """
    try:
        p = get_printer()

        # ── MUROD OIL — katta, qalin ────────────────────────
        p.set(align="center", bold=True,
              double_height=True, double_width=True)
        p.text(f"{SHOP_NAME}\n")

        # ── OIL CHANGE ──────────────────────────────────────
        p.set(align="center", bold=True,
              double_height=False, double_width=False)
        p.text(f"{SHOP_SUB}\n")
        p.text(_line("="))

        # ── Manzil va telefon ────────────────────────────────
        p.set(align="center", bold=False)
        p.text(f"{SHOP_ADDRESS}\n")
        p.text(f"{SHOP_PHONE}\n")
        p.text(_line("="))

        # ── Kassir ───────────────────────────────────────────
        p.set(align="left", bold=False)
        kassir_name = sale.kassir.username if sale.kassir else "Kassir"
        p.text(_row("Kassir:", kassir_name))

        # ── Chek raqami va sana ──────────────────────────────
        p.set(bold=True)
        chek = f"Chek No {sale.id}"
        sana = sale.created_at.strftime("%d.%m.%Y %H:%M")
        gap  = W - len(chek) - len(sana)
        p.text(f"{chek}{' ' * max(1, gap)}{sana}\n")
        p.text(_line("="))

        # ── Mijoz (faqat bog'langan bo'lsa) ─────────────────
        if client:
            p.set(bold=False)
            p.text(_row("Mijoz:", client.full_name))
            if client.phone:
                p.text(_row("Tel:", client.phone))
            if client.car_number:
                p.text(_row("Mashina:", client.car_number))
            if client.car_model:
                p.text(_row("Model:", client.car_model))
            p.text(_line())

        # ── Mahsulotlar (faqat qaytarilmaganlar) ─────────────
        aktiv_items = [item for item in sale.items if item.is_active]
        for i, item in enumerate(aktiv_items, 1):
            p.set(align="left", bold=True)
            p.text(f"{i}. {item.batch.product.name}\n")
            qty_str   = f"   {item.quantity} x {int(item.sale_price):,}"
            total_str = f"{int(item.total):,}"
            p.set(bold=False)
            p.text(_row(qty_str, total_str))

            # Mahsulotga chegirma bo'lsa ko'rsatish
            if item.discount_percent > 0:
                p.text(f"   Chegirma: {item.discount_percent}%\n")
            elif item.discount_amount > 0:
                p.text(f"   Chegirma: -{int(item.discount_amount):,}\n")

            p.text(_line())

        # ── Jami ─────────────────────────────────────────────
        p.set(bold=False)

        # Umumiy chegirma bo'lsa ko'rsatish
        if sale.discount_amount > 0:
            p.text(_row("Chegirmadan oldin:", f"{int(sale.total_amount):,}"))
            p.text(_row("Chegirma:", f"-{int(sale.discount_amount):,}"))
            p.text(_line())

        p.set(bold=True)
        p.text(_row("JAMI:", f"{int(sale.final_amount):,} so'm"))
        p.text(_line("="))

        # ── To'lov ───────────────────────────────────────────
        p.set(bold=False)
        p.text("To'lov:\n")

        payment = sale.payment_type.value if hasattr(sale.payment_type, 'value') else str(sale.payment_type)

        if payment == "naqd":
            p.text(_row("  Naqd:", f"{int(sale.paid_amount):,} so'm"))

        elif payment == "karta":
            p.text(_row("  Karta:", f"{int(sale.paid_amount):,} so'm"))

        elif payment == "aralash":
            p.text(_row("  To'langan:", f"{int(sale.paid_amount):,} so'm"))
            if sale.debt_amount > 0:
                p.text(_row("  Qarz:", f"{int(sale.debt_amount):,} so'm"))

        elif payment == "qarz":
            p.text(_row("  Qarz:", f"{int(sale.debt_amount):,} so'm"))

        # ── Izoh ─────────────────────────────────────────────
        if sale.note:
            p.text(_line())
            p.text(f"Izoh: {sale.note}\n")

        # ── Probeg ma'lumoti (faqat oil_record bo'lsa) ──────
        if oil_record:
            p.text(_line("="))
            p.set(bold=True)
            p.text("PROBEG MA'LUMOTI\n")
            p.set(bold=False)

            if oil_record.mileage:
                p.text(_row("Probeg:", f"{oil_record.mileage:,} km"))

            if oil_record.next_date:
                p.text(_row("Keyingi:", str(oil_record.next_date)))

            if oil_record.oil_brand or oil_record.oil_type:
                brand_type = " ".join(filter(None, [
                    oil_record.oil_brand,
                    oil_record.oil_type
                ]))
                p.text(_row("Moy:", brand_type))

            if oil_record.transmission:
                p.text(_row("Karobka:", oil_record.transmission))

            filters = []
            if getattr(oil_record, "oil_filter",   False): filters.append("Moy filtri")
            if getattr(oil_record, "air_filter",   False): filters.append("Havo filtri")
            if getattr(oil_record, "salon_filter", False): filters.append("Salon filtri")
            if getattr(oil_record, "spark_plug",   False): filters.append("Shamlar")
            if getattr(oil_record, "fuel_filter",  False): filters.append("Yoqilg'i filtri")
            if getattr(oil_record, "pampers",      False): filters.append("Pampers")
            if filters:
                p.text(f"Almashtir.: {', '.join(filters)}\n")

            if oil_record.master_name:
                p.text(_row("Usta:", oil_record.master_name))

            if oil_record.note:
                p.text(f"Izoh: {oil_record.note}\n")

        # ── Rahmat ───────────────────────────────────────────
        p.text(_line("="))
        p.set(align="center", bold=True)
        p.text("Xaridingiz uchun rahmat!\n")
        p.set(bold=False)
        p.text("\n\n\n")
        p.cut()

        return {"printed": True}

    except Exception as e:
        print(f"[PRINTER] Xato: {e}")
        return {"printed": False, "error": str(e)}


def print_test() -> dict:
    """Printer ulangan-ulanmaganini tekshirish uchun test cheki"""
    try:
        p = get_printer()
        p.set(align="center", bold=True)
        p.text("TEST CHEKI\n")
        p.set(bold=False)
        p.text(f"{datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n")
        p.text("Printer ishlayapti!\n")
        p.text("\n\n")
        p.cut()
        return {"printed": True}
    except Exception as e:
        return {"printed": False, "error": str(e)}