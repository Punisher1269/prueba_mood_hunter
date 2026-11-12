"""Flujo de estados del tablero, por `code`. Es la única fuente de verdad de las transiciones."""

INITIAL_STATUS = "created"

TRANSITIONS: dict[str, list[str]] = {
    "created": ["in_review"],
    "in_review": ["in_progress", "paused"],
    "in_progress": ["done", "paused"],
    "paused": ["in_progress", "in_review"],
    "done": [],
}


def allowed_codes(code: str) -> list[str]:
    return TRANSITIONS.get(code, [])


def can_transition(from_code: str, to_code: str) -> bool:
    return to_code in allowed_codes(from_code)
