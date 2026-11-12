from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from models import EventType, RequestEvent
from schemas.common import StatusOut, UtcDatetime


class HistoryEventOut(BaseModel):
    """`from`/`to` son estados en `status_changed` y textos en las ediciones."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    type: EventType
    from_: StatusOut | str | None = Field(default=None, alias="from")
    to: StatusOut | str | None = None
    at: UtcDatetime

    @classmethod
    def from_model(cls, ev: RequestEvent) -> HistoryEventOut:
        if ev.event_type == EventType.STATUS_CHANGED:
            from_ = StatusOut.model_validate(ev.from_status) if ev.from_status else None
            to = StatusOut.model_validate(ev.to_status) if ev.to_status else None
        else:
            from_, to = ev.old_value, ev.new_value

        return cls(type=ev.event_type, from_=from_, to=to, at=ev.created_at)
