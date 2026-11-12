import json
from datetime import datetime
from functools import lru_cache

import openai
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from sqlalchemy.orm import Session

from models import EventType, Request
from schemas import RequestOut
from services.exceptions import SummaryTimeoutError, SummaryUnavailableError
from services.request_service import RequestService
from settings import settings
from settings.db import utc_now

SYSTEM_PROMPT = """Eres un asistente que resume el recorrido de solicitudes en un tablero de trabajo.
Recibirás un JSON con el título, estado actual, descripción e historial de UNA solicitud.
Escribe en español un resumen de 2 a 4 frases: estado actual, cómo llegó ahí (cambios de estado,
pausas, ediciones) y hace cuánto fue el último movimiento.
Usa solo los datos recibidos; no inventes información ni des recomendaciones.
Responde solo con el texto del resumen, sin títulos ni viñetas."""

DESCRIPTION_LIMIT = 300


@lru_cache
def get_agent():
    """Se construye una sola vez por proceso."""
    if not settings.openai_api_key:
        raise SummaryUnavailableError("El servicio de resumen no está configurado.")

    model = ChatOpenAI(
        model=settings.openai_model,
        api_key=settings.openai_api_key,
        timeout=settings.llm_timeout_s,
        max_retries=1,
        temperature=0.2,
    )
    return create_agent(model=model, tools=[], system_prompt=SYSTEM_PROMPT)


def _days_since(value: datetime, now: datetime) -> int:
    return max((now - value).days, 0)


def build_payload(req: Request) -> dict:
    """Solo lo necesario para resumir: sin ids internos y con la descripción recortada."""
    now = utc_now()
    history = []
    for e in req.events:
        item: dict = {"type": e.event_type.value, "days_ago": _days_since(e.created_at, now)}
        if e.event_type == EventType.STATUS_CHANGED:
            item["from"] = e.from_status.label if e.from_status else None
            item["to"] = e.to_status.label if e.to_status else None
        elif e.event_type == EventType.TITLE_CHANGED:
            item["from"], item["to"] = e.old_value, e.new_value
        history.append(item)

    return {
        "title": req.title,
        "status": req.status.label,
        "description": req.description[:DESCRIPTION_LIMIT],
        "created_days_ago": _days_since(req.created_at, now),
        "history": history,
    }


class SummaryService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.requests = RequestService(db)

    def generate(self, request_id: int) -> RequestOut:
        req = self.requests.get(request_id)
        text = self._ask_llm(build_payload(req))

        # No se toca updated_at: guardar el resumen no cuenta como cambio de la solicitud
        req.ai_summary = text
        req.ai_summary_generated_at = utc_now()
        self.requests.commit()
        return self.requests.to_out(req)

    def _ask_llm(self, payload: dict) -> str:
        agent = get_agent()
        message = json.dumps(payload, ensure_ascii=False)
        try:
            result = agent.invoke({"messages": [{"role": "user", "content": message}]})
        except openai.APITimeoutError as e:
            raise SummaryTimeoutError("El resumen tardó demasiado en responder. Intenta de nuevo.") from e
        except openai.OpenAIError as e:
            raise SummaryUnavailableError("El servicio de resumen no está disponible en este momento.") from e

        text = (result["messages"][-1].text or "").strip()
        if not text:
            raise SummaryUnavailableError("El servicio de resumen devolvió una respuesta vacía.")
        return text
