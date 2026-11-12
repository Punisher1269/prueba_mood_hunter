from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer


def _as_utc(value: datetime) -> str:
    """La BD guarda DATETIME en UTC sin zona; se agrega para que el front no lo lea como hora local."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


UtcDatetime = Annotated[datetime, PlainSerializer(_as_utc, return_type=str)]


class StatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    label: str
