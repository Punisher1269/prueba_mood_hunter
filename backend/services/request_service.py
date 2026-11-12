from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import EventType, Request, RequestEvent, Status
from schemas import HistoryEventOut, RequestCreate, RequestOut, RequestUpdate
from services import workflow
from services.exceptions import InvalidTransitionError, NotFoundError
from services.status_service import StatusService
from settings.db import utc_now

# Campo editable -> tipo de evento que deja en el historial
_EDIT_EVENTS = {
    "title": EventType.TITLE_CHANGED,
    "description": EventType.DESCRIPTION_CHANGED,
}


class RequestService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.statuses = StatusService(db)


    def get(self, request_id: int, *, for_update: bool = False) -> Request:
        req = self.db.get(Request, request_id, with_for_update=for_update)
        if req is None:
            raise NotFoundError("La solicitud no existe.")
        return req

    def list(self) -> list[RequestOut]:
        requests = self.db.scalars(select(Request).order_by(Request.id)).unique()
        return [self.to_out(r) for r in requests]

    def allowed_transitions(self, request_id: int) -> list[Status]:
        return self.statuses.allowed_for(self.get(request_id).status)

    def history(self, request_id: int) -> list[HistoryEventOut]:
        return [HistoryEventOut.from_model(e) for e in self.get(request_id).events]

    def to_out(self, req: Request) -> RequestOut:
        return RequestOut.from_model(req, self.statuses.allowed_for(req.status))

    # ─── Escritura (cada método es una transacción) ───

    def create(self, data: RequestCreate) -> RequestOut:
        now = utc_now()
        req = Request(
            title=data.title,
            description=data.description,
            status=self.statuses.get_by_code(workflow.INITIAL_STATUS),
            created_at=now,
            updated_at=now,
        )
        req.events.append(RequestEvent(event_type=EventType.CREATED, created_at=now))
        self.db.add(req)
        self.commit()
        self.db.refresh(req)
        return self.to_out(req)

    def update(self, request_id: int, data: RequestUpdate) -> RequestOut:
        req = self.get(request_id, for_update=True)
        now = utc_now()
        changed = False

        for field, new_value in data.model_dump(exclude_unset=True).items():
            old_value = getattr(req, field)
            if new_value == old_value:
                continue
            req.events.append(
                RequestEvent(
                    event_type=_EDIT_EVENTS[field],
                    old_value=old_value,
                    new_value=new_value,
                    created_at=now,
                )
            )
            setattr(req, field, new_value)
            changed = True

        if changed:
            req.updated_at = now
            self.commit()
        else:
            self.db.rollback()  # libera el FOR UPDATE
        return self.to_out(req)

    def transition(self, request_id: int, to_code: str) -> RequestOut:
        req = self.get(request_id, for_update=True)
        target = self.statuses.get_by_code(to_code)
        current = req.status

        if not workflow.can_transition(current.code, target.code):
            self.db.rollback()
            raise InvalidTransitionError(f"Transición no permitida: {current.label} → {target.label}")

        now = utc_now()
        req.events.append(
            RequestEvent(
                event_type=EventType.STATUS_CHANGED,
                from_status=current,
                to_status=target,
                created_at=now,
            )
        )
        req.status = target
        req.updated_at = now
        self.commit()
        return self.to_out(req)

    def commit(self) -> None:
        try:
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
