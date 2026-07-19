from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.init_db import init_db
from app.db.base import get_db

from app.routers import (
    auth, users, category, brand, unit,
    kontragent, product, batch, income,
    payment, client, oil_record,
    warehouse_transfer, sale, client_debt,
    daily_stat, kassa_page, camera,
    safe_transaction, kontragent_return,
    cash_register, advanced_stats, sync
)

from app.routers.printer import router as printer_router
from app.routers.label import router as label_router
from app.core.sync_worker import start_sync_worker
from app.services.sync_service import flush_queue
from app.models.sync_queue import SyncQueue  # jadval avtomatik yaratiladi


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Bazani ishga tushirish
    init_db()

    # Sync worker ishga tushirish
    start_sync_worker(get_db, flush_queue)

    yield


app = FastAPI(
    title="Murodoil POS",
    description="Murodoil do'koni uchun POS tizimi",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(category.router)
app.include_router(brand.router)
app.include_router(unit.router)
app.include_router(kontragent.router)
app.include_router(product.router)
app.include_router(batch.router)
app.include_router(income.router)
app.include_router(payment.router)
app.include_router(client.router)
app.include_router(oil_record.router)
app.include_router(warehouse_transfer.router)
app.include_router(sale.router)
app.include_router(client_debt.router)
app.include_router(daily_stat.router)

app.include_router(kassa_page.router)
app.include_router(camera.router)

app.include_router(safe_transaction.router)
app.include_router(kontragent_return.router)
app.include_router(cash_register.router)
app.include_router(advanced_stats.router)
app.include_router(sync.router)



app.include_router(printer_router)
app.include_router(label_router)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )

