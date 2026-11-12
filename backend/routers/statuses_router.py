from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from schemas import StatusOut
from services.status_service import StatusService
from settings.db import get_db

router = APIRouter(prefix="/statuses")


def get_status_service(db: Session = Depends(get_db)) -> StatusService:  # noqa: B008
    return StatusService(db)


@router.get("", response_model=list[StatusOut])
def list_statuses(service: StatusService = Depends(get_status_service)):  # noqa: B008
    return service.list()
