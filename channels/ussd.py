from fastapi.responses import PlainTextResponse
from typing import List

from channels.intake import get_prompt_for_stage, new_session, process_intake_input
from services.session import session_store

CHANNEL = "ussd"
USSD_MAX = 160


def build_response(message: str, end: bool = False) -> PlainTextResponse:
    if len(message) > USSD_MAX and not end:
        message = message[: USSD_MAX - 3] + "..."
    prefix = "END" if end else "CON"
    return PlainTextResponse(f"{prefix} {message[:USSD_MAX]}", media_type="text/plain")


def parse_ussd_text(text: str) -> List[str]:
    if text is None:
        return []
    return [part for part in text.strip().split("*") if part != ""]


def handle_ussd_input(session_id: str, text: str, phone_number: str) -> PlainTextResponse:
    inputs = parse_ussd_text(text)
    session = session_store.get(session_id, CHANNEL) or new_session(phone_number, CHANNEL)

    if not inputs:
        session["stage"] = "language"
        session_store.set(session_id, session, CHANNEL)
        return build_response(get_prompt_for_stage("language"))

    latest = inputs[-1]
    session, message, end = process_intake_input(session, latest)

    if end:
        session_store.delete(session_id, CHANNEL)
        return build_response(message, end=True)

    session_store.set(session_id, session, CHANNEL)
    return build_response(message)
