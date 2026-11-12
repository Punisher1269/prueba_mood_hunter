from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, StringConstraints, model_validator

from models import Request, Status
from schemas.common import StatusOut, UtcDatetime

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=150)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class RequestCreate(BaseModel):
    title: Title
    description: Description = ""


class RequestUpdate(BaseModel):
    """PATCH: el front envía solo los campos que cambiaron."""

    title: Title | None = None
    description: Description | None = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> RequestUpdate:
        if not self.model_fields_set:
            raise ValueError("Debes enviar al menos un campo para actualizar")
        if "title" in self.model_fields_set and self.title is None:
            raise ValueError("El título no puede quedar vacío")
        return self


class TransitionIn(BaseModel):
    to: str


class AiSummaryOut(BaseModel):
    text: str
    generated_at: UtcDatetime


class RequestOut(BaseModel):
    id: int
    title: str
    description: str
    status: StatusOut
    allowed_transitions: list[StatusOut]
    created_at: UtcDatetime
    updated_at: UtcDatetime
    ai_summary: AiSummaryOut | None

    @classmethod
    def from_model(cls, req: Request, allowed: list[Status]) -> RequestOut:
        summary = None
        if req.ai_summary is not None and req.ai_summary_generated_at is not None:
            summary = AiSummaryOut(text=req.ai_summary, generated_at=req.ai_summary_generated_at)

        return cls(
            id=req.id,
            title=req.title,
            description=req.description,
            status=StatusOut.model_validate(req.status),
            allowed_transitions=[StatusOut.model_validate(s) for s in allowed],
            created_at=req.created_at,
            updated_at=req.updated_at,
            ai_summary=summary,
        )
