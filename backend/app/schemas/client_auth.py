from pydantic import BaseModel


class ClientLoginRequest(BaseModel):
    phone: str
    password: str
