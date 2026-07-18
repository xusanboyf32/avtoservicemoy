"""
Godex G500-U — ZPL protokoli, Win32Raw orqali
Ikki usul:
  1. Bitta mahsulot → POST /label/print
  2. Ko'p mahsulot (navbat) → POST /label/batch-print
"""
from app.core.config import settings


def get_label_printer():
    from escpos.printer import Win32Raw
    return Win32Raw(settings.GODEX_PRINTER_NAME)


def build_label_zpl(product_id: int, product_name: str, price: int, quantity: int = 1) -> str:
    """
    ZPL format — Godex G500-U
    40mm × 30mm, 203 dpi
    """
    name = product_name[:22] if len(product_name) > 22 else product_name
    price_formatted = f"{price:,}".replace(",", " ")

    return f"""^XA
^MMT
^PW320
^LL240
^LS0
^FO8,8^GB304,224,2^FS
^FO12,14^A0N,20,20^FDMUROD OIL^FS
^FO220,12^GB88,28,1^FS
^FO224,16^A0N,16,16^FDKOD: {product_id}^FS
^FO12,46^GB296,2,1^FS
^FO12,56^A0N,26,26^FD{name}^FS
^FO12,90^GB296,2,1^FS
^FO60,108^GB200,60,1^FS
^FO70,115^A0N,40,40^FD{price_formatted}^FS
^FO246,130^A0N,18,18^FDUZS^FS
^PQ{quantity},0,1,Y
^XZ"""


def print_label(product_id: int, product_name: str, price: int, quantity: int = 1) -> dict:
    """Bitta mahsulot — nechta kerak bo'lsa quantity"""
    try:
        p = get_label_printer()
        zpl = build_label_zpl(product_id, product_name, price, quantity)
        p.text(zpl)
        print(f"[GODEX] Chiqarildi: {product_name} x{quantity}")
        return {"printed": True, "quantity": quantity}
    except Exception as e:
        print(f"[GODEX] Xato: {e}")
        return {"printed": False, "error": str(e)}


def print_label_batch(items: list) -> dict:
    """
    Ko'p mahsulot navbat bilan.
    items = [
      {"product_id": 1, "product_name": "Olma", "price": 12000, "quantity": 20},
      {"product_id": 2, "product_name": "Behi", "price": 14000, "quantity": 15},
    ]
    """
    try:
        p = get_label_printer()
        results = []

        for item in items:
            zpl = build_label_zpl(
                product_id=item["product_id"],
                product_name=item["product_name"],
                price=item["price"],
                quantity=item["quantity"]
            )
            p.text(zpl)
            print(f"[GODEX] Chiqarildi: {item['product_name']} x{item['quantity']}")
            results.append({
                "product_id": item["product_id"],
                "product_name": item["product_name"],
                "quantity": item["quantity"],
                "ok": True
            })

        return {
            "printed": True,
            "total_items": len(items),
            "total_labels": sum(i["quantity"] for i in items),
            "results": results
        }
    except Exception as e:
        print(f"[GODEX] Batch xato: {e}")
        return {"printed": False, "error": str(e)}


def print_label_test() -> dict:
    """Test yorliq"""
    return print_label(
        product_id=1,
        product_name="TEST MAHSULOT",
        price=100000,
        quantity=1
    )

