"""
Internet yo'q bo'lganda sync navbatga qo'yiladi.
Internet kelganda navbatdagi hammasi yuboriladi.
"""
from sqlalchemy import Column, Integer, String, Boolean, Text
from app.db.base import Base
from app.utils import TimestampMixin
import json


class SyncQueue(Base, TimestampMixin):
    __tablename__ = "sync_queue"

    # Qaysi jadval: "sales", "clients", "kontragents", "oil_records"
    table_name = Column(String, nullable=False)

    # Qanday amal: "create", "update", "delete"
    action = Column(String, nullable=False)

    # Ma'lumotlar JSON formatda
    payload = Column(Text, nullable=False)

    # Yuborilganmi
    sent = Column(Boolean, default=False)

    # Urinishlar soni (3 dan oshsa — skip)
    attempts = Column(Integer, default=0)

    # Xato xabari (debug uchun)
    error = Column(String, nullable=True)

