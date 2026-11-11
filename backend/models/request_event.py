from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Text, func
from sqlalchemy.dialects.mysql import INTEGER, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from settings.db import Base, utc_now

if TYPE_CHECKING:
    from models.request import Request
    from models.status import Status


class EventType(str, enum.Enum):
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    TITLE_CHANGED = "title_changed"
    DESCRIPTION_CHANGED = "description_changed"


class RequestEvent(Base):
    """Historial de auditoría. Solo lo escribe el servicio, en la misma transacción del cambio."""

    __tablename__ = "request_events"
    __table_args__ = (
        Index("idx_events_request_date", "request_id", "created_at"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    id: Mapped[int] = mapped_column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    request_id: Mapped[int] = mapped_column(
        INTEGER(unsigned=True),
        ForeignKey("requests.id", name="fk_events_request", ondelete="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[EventType] = mapped_column(
        Enum(
            EventType,
            name="event_type",
            values_callable=lambda e: [member.value for member in e],
            validate_strings=True,
        ),
        nullable=False,
    )
    from_status_id: Mapped[int | None] = mapped_column(
        TINYINT(unsigned=True),
        ForeignKey("statuses.id", name="fk_events_from_status", ondelete="RESTRICT", onupdate="RESTRICT"),
        nullable=True,
    )
    to_status_id: Mapped[int | None] = mapped_column(
        TINYINT(unsigned=True),
        ForeignKey("statuses.id", name="fk_events_to_status", ondelete="RESTRICT", onupdate="RESTRICT"),
        nullable=True,
    )
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utc_now, server_default=func.now()
    )

    request: Mapped[Request] = relationship(back_populates="events")
    # Dos llaves hacia la misma tabla: hay que decirle a SQLAlchemy cuál usa cada relación
    from_status: Mapped[Status | None] = relationship(foreign_keys=[from_status_id], lazy="joined")
    to_status: Mapped[Status | None] = relationship(foreign_keys=[to_status_id], lazy="joined")

    def __repr__(self) -> str:
        return f"<RequestEvent {self.event_type.value} request={self.request_id}>"