from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Status
from services import workflow
from services.exceptions import ValidationError


class StatusService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self._by_code: dict[str, Status] | None = None

    def list(self) -> list[Status]:
        return list(self.db.scalars(select(Status).order_by(Status.sort_order)))


    def by_code(self) -> dict[str, Status]:
        """Catálogo pequeño: se carga una vez por petición para evitar consultas repetidas."""
        if self._by_code is None:
            self._by_code = {s.code: s for s in self.list()}
        return self._by_code


    def get_by_code(self, code: str) -> Status:
        status = self.by_code().get(code)
        if status is None:
            raise ValidationError(f"Estado desconocido: {code}")
        return status


    def allowed_for(self, status: Status) -> list[Status]:
        catalog = self.by_code()
        return [catalog[c] for c in workflow.allowed_codes(status.code) if c in catalog]
