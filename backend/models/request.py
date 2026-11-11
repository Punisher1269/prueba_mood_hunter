from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.mysql import INTEGER, TINYINT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from settings.db import Base, utc_now

if TYPE_CHECKING:
    from models.request_event import RequestEvent
    from models.status import Status


class Request(Base):
    __tablename__ = "requests"
    __table_args__ = (
        CheckConstraint("CHAR_LENGTH(TRIM(title)) > 0", name="chk_requests_title_not_blank"),
        Index("idx_requests_status", "status_id"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    id: Mapped[int] = mapped_column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="", server_default="")
    status_id: Mapped[int] = mapped_column(
        TINYINT(unsigned=True),
        ForeignKey("statuses.id", name="fk_requests_status", ondelete="RESTRICT", onupdate="RESTRICT"),
        nullable=False,
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary_generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utc_now, server_default=func.now()
    )
    # Sin onupdate a propósito: guardar el resumen de IA no cuenta como cambio.
    # El servicio lo actualiza a mano al editar o transicionar.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utc_now, server_default=func.now()
    )

    # Siempre se necesita el estado para responder, así que se trae en la misma consulta
    status: Mapped[Status] = relationship(lazy="joined")

    events: Mapped[list[RequestEvent]] = relationship(
        back_populates="request",
        order_by="(RequestEvent.created_at, RequestEvent.id)",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<Request {self.id} '{self.title}'>"