from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from schemas import (
    HistoryEventOut,
    RequestCreate,
    RequestOut,
    RequestUpdate,
    StatusOut,
    TransitionIn,
)
from services.request_service import RequestService
from services.summary_service import SummaryService
from settings.db import get_db

router = APIRouter(prefix="/requests")


def get_request_service(db: Session = Depends(get_db)) -> RequestService:  # noqa: B008
    return RequestService(db)


def get_summary_service(db: Session = Depends(get_db)) -> SummaryService:  # noqa: B008
    return SummaryService(db)


@router.get("", response_model=list[RequestOut])
def list_requests(service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.list()


@router.post("", response_model=RequestOut, status_code=status.HTTP_201_CREATED)
def create_request(data: RequestCreate, service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.create(data)


@router.patch("/{id}", response_model=RequestOut)
def update_request(id: int, data: RequestUpdate, service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.update(id, data)


@router.post("/{id}/transitions", response_model=RequestOut)
def transition_request(id: int, data: TransitionIn, service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.transition(id, data.to)


@router.get("/{id}/transitions", response_model=list[StatusOut])
def get_transitions(id: int, service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.allowed_transitions(id)


@router.get("/{id}/history", response_model=list[HistoryEventOut])
def get_history(id: int, service: RequestService = Depends(get_request_service)):  # noqa: B008
    return service.history(id)


@router.post("/{id}/summary", response_model=RequestOut)
def generate_summary(id: int, service: SummaryService = Depends(get_summary_service)):  # noqa: B008
    return service.generate(id)
