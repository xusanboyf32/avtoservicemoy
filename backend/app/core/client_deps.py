from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException, status, Security
from sqlalchemy.orm import Session
from app.db.base import get_db
from app.core.security import decode_access_token
from app.models.client import Client

client_security = HTTPBearer()


def get_current_client(
    credentials: HTTPAuthorizationCredentials = Security(client_security),
    db: Session = Depends(get_db),
) -> Client:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token xato yoki muddati o'tgan",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(credentials.credentials)
    if payload is None or payload.get("type") != "client":
        raise exc

    client_id = payload.get("sub")
    if client_id is None:
        raise exc

    client = db.query(Client).filter(Client.id == int(client_id)).first()
    if client is None:
        raise exc
    return client
