from sqlalchemy import String, UniqueConstraint
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.orm import Mapped, mapped_column

from settings.db import Base


class Status(Base):
    """Catálogo de estados. `id` es interno; `code` es lo que expone la API."""

    __tablename__ = "statuses"
    __table_args__ = (
        UniqueConstraint("code", name="uq_statuses_code"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"},
    )

    id: Mapped[int] = mapped_column(TINYINT(unsigned=True), primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    sort_order: Mapped[int] = mapped_column(TINYINT(unsigned=True), nullable=False)

    def __repr__(self) -> str:
        return f"<Status {self.code}>"