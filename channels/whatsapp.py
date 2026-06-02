import os

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from langdetect import detect, LangDetectException

from channels.intake import LANGUAGE_LABELS, get_prompt_for_stage, new_session, process_intake_input
from services.session import session_store

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN") or WHATSAPP_TOKEN
GRAPH_API = "https://graph.facebook.com/v19.0"
CHANNEL = "whatsapp"


def verify_webhook_token(token: str) -> bool:
    return token == WHATSAPP_VERIFY_TOKEN


def _api_url(path: str) -> str:
    phone_id = os.getenv("WHATSAPP_PHONE_ID", "")
    return f"{GRAPH_API}/{phone_id}/{path}"


def send_text(phone_number: str, message: str) -> bool:
    return _send_payload(
        phone_number,
        {"messaging_product": "whatsapp", "to": phone_number, "type": "text", "text": {"body": message[:4096]}},
    )


def send_buttons(phone_number: str, body: str, buttons: list[tuple[str, str]]) -> bool:
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": body[:1024]},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": bid, "title": title[:20]}}
                    for bid, title in buttons[:3]
                ]
            },
        },
    }
    return _send_payload(phone_number, payload)


def _send_payload(phone_number: str, payload: dict) -> bool:
    phone_id = os.getenv("WHATSAPP_PHONE_ID")
    access_token = WHATSAPP_TOKEN
    if not phone_id or not access_token:
        return False
    url = f"{GRAPH_API}/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    try:
        response = httpx.post(url, json=payload, headers=headers, timeout=15)
        return response.status_code == 200
    except Exception as exc:
        print(f"WhatsApp send error: {exc}")
        return False


def _detect_language(text: str) -> str:
    try:
        code = detect(text)
        mapping = {"en": "english", "sw": "kiswahili", "fr": "french", "rw": "kinyarwanda"}
        return mapping.get(code, "english")
    except LangDetectException:
        return "english"


def _extract_message_body(message: dict) -> tuple[str, str]:
    msg_type = message.get("type", "text")
    if msg_type == "text":
        return message.get("text", {}).get("body", ""), "text"
    if msg_type == "interactive":
        interactive = message.get("interactive", {})
        if interactive.get("type") == "button_reply":
            return interactive["button_reply"].get("id", ""), "button"
        if interactive.get("type") == "list_reply":
            return interactive["list_reply"].get("id", ""), "list"
    return "", msg_type


def _normalize_button_input(text: str) -> str:
    mapping = {
        "yes": "1",
        "no": "2",
        "daily": "1",
        "long_acting": "2",
        "set-forget": "2",
        "breastfeeding_yes": "1",
        "breastfeeding_no": "2",
        "health_yes": "1",
        "health_no": "2",
        "access_yes": "1",
        "access_no": "2",
        "facility_yes": "1",
        "facility_no": "2",
    }
    return mapping.get(text.lower(), text)


async def handle_whatsapp_webhook(request: Request) -> JSONResponse:
    data = await request.json()
    try:
        value = data["entry"][0]["changes"][0]["value"]
    except (KeyError, IndexError):
        return JSONResponse({"status": "received"}, status_code=200)

    if "messages" not in value:
        return JSONResponse({"status": "received"}, status_code=200)

    for message in value["messages"]:
        phone_number = message["from"]
        body, msg_kind = _extract_message_body(message)
        if not body:
            continue

        session_id = phone_number
        session = session_store.get(session_id, CHANNEL)

        if not session and msg_kind == "text":
            detected = _detect_language(body)
            session = new_session(phone_number, CHANNEL)
            session["language"] = detected if detected in LANGUAGE_LABELS else "english"
            session_store.set(session_id, session, CHANNEL)
            send_buttons(
                phone_number,
                f"Welcome to ContraBot ({session['language']}). Start counseling?",
                [("start", "Start"), ("help", "Help")],
            )
            continue

        if body.lower() in ("help", "hi", "hello") and not session:
            send_text(phone_number, "ContraBot helps you find safe contraception. Reply Start to begin.")
            continue

        if body.lower() in ("start", "1") and session and session.get("stage") == "language":
            send_text(phone_number, get_prompt_for_stage("age"))
            session["stage"] = "age"
            session_store.set(session_id, session, CHANNEL)
            continue

        if not session:
            session = new_session(phone_number, CHANNEL)
            session_store.set(session_id, session, CHANNEL)
            send_text(phone_number, get_prompt_for_stage("language"))
            continue

        normalized = _normalize_button_input(body)
        session, reply, end = process_intake_input(session, normalized)

        if end:
            session_store.delete(session_id, CHANNEL)
            send_text(phone_number, reply)
            continue

        session_store.set(session_id, session, CHANNEL)

        stage = session.get("stage")
        if stage in ("breastfeeding", "health_flags", "preference", "access"):
            prompts = {
                "breastfeeding": ("Breastfeeding under 6 months?", [("breastfeeding_yes", "Yes"), ("breastfeeding_no", "No")]),
                "health_flags": ("Health risks (HTN/migraine/clots)?", [("health_yes", "Yes"), ("health_no", "No")]),
                "preference": ("Your preference?", [("daily", "Daily pill"), ("long_acting", "Set-forget")]),
                "access": ("Clinic access?", [("access_yes", "Yes"), ("access_no", "No")]),
            }
            if stage in prompts:
                text, buttons = prompts[stage]
                send_buttons(phone_number, text, buttons)
                continue

        if session.get("awaiting_facility"):
            send_buttons(phone_number, reply, [("facility_yes", "Find clinic"), ("facility_no", "Done")])
        else:
            send_text(phone_number, reply)

    return JSONResponse({"status": "received"}, status_code=200)


async def verify_whatsapp_webhook(request: Request) -> JSONResponse:
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and verify_webhook_token(token):
        return JSONResponse(content=int(challenge), status_code=200)

    return JSONResponse({"error": "Verification failed"}, status_code=403)
