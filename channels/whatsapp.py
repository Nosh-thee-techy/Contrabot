import os
import json
import time
import asyncio
import hmac
import hashlib
from typing import Any, Optional

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from langdetect import detect, LangDetectException

from channels.intake import LANGUAGE_LABELS, get_prompt_for_stage, new_session, process_intake_input
from services.session import session_store
from services.knowledge import query_all_collections
from engine.recommender import load_system_prompt
from app.openai_client import chat_completion
from channels.whatsapp_logger import logger

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN") or WHATSAPP_TOKEN
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET")
GRAPH_API = "https://graph.facebook.com/v19.0"
CHANNEL = "whatsapp"

# Connection pooling limits for Meta API
client_limits = httpx.Limits(max_connections=20, max_keepalive_connections=5)
async_client = httpx.AsyncClient(limits=client_limits, timeout=15.0)

# In-memory deduplication cache fallback
DEDUP_CACHE = {}  # dict of msg_id -> timestamp
DEDUP_TTL = 300   # 5 minutes

def verify_webhook_token(token: str) -> bool:
    return token == WHATSAPP_VERIFY_TOKEN

def verify_signature(body: bytes, signature: Optional[str]) -> bool:
    if not WHATSAPP_APP_SECRET or WHATSAPP_APP_SECRET == "your-whatsapp-app-secret":
        logger.warning("WHATSAPP_APP_SECRET not configured, skipping signature verification")
        return True
    if not signature or not signature.startswith("sha256="):
        return False
    expected = hmac.new(WHATSAPP_APP_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    actual = signature[7:]
    return hmac.compare_digest(expected, actual)

def is_duplicate_message(msg_id: str) -> bool:
    if not msg_id:
        return False
    
    if session_store._use_redis and session_store._redis:
        try:
            key = f"contrabot:whatsapp_dedup:{msg_id}"
            success = session_store._redis.set(key, "1", ex=DEDUP_TTL, nx=True)
            return not success
        except Exception as exc:
            logger.error(f"Redis deduplication check failed: {exc}")
            
    now = time.time()
    # clean expired
    expired = [k for k, t in DEDUP_CACHE.items() if now - t > DEDUP_TTL]
    for k in expired:
        del DEDUP_CACHE[k]
        
    if msg_id in DEDUP_CACHE:
        return True
    DEDUP_CACHE[msg_id] = now
    return False

async def _send_payload(phone_number: str, payload: dict) -> bool:
    phone_id = os.getenv("WHATSAPP_PHONE_ID")
    access_token = WHATSAPP_TOKEN
    if not phone_id or not access_token:
        logger.error("Missing WHATSAPP_PHONE_ID or WHATSAPP_TOKEN in environment")
        return False
    url = f"{GRAPH_API}/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    
    for attempt in range(3):
        try:
            response = await async_client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                logger.info(
                    "Successfully sent WhatsApp payload",
                    extra={"phone": phone_number}
                )
                return True
            else:
                logger.error(
                    f"Meta Graph API error (Attempt {attempt+1}): {response.status_code} - {response.text}",
                    extra={"phone": phone_number}
                )
        except Exception as exc:
            logger.error(
                f"Error sending WhatsApp payload (Attempt {attempt+1}): {exc}",
                extra={"phone": phone_number},
                exc_info=True
            )
        if attempt < 2:
            await asyncio.sleep(2 ** attempt)
    return False

async def send_text(phone_number: str, message: str) -> bool:
    return await _send_payload(
        phone_number,
        {"messaging_product": "whatsapp", "to": phone_number, "type": "text", "text": {"body": message[:4096]}},
    )

async def send_buttons(phone_number: str, body: str, buttons: list[tuple[str, str]]) -> bool:
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
    return await _send_payload(phone_number, payload)

async def send_list(
    phone_number: str,
    body: str,
    button_label: str,
    sections: list[dict],
    header: Optional[str] = None,
    footer: Optional[str] = None
) -> bool:
    interactive = {
        "type": "list",
        "body": {"text": body[:1024]},
        "action": {
            "button": button_label[:20],
            "sections": sections
        }
    }
    if header:
        interactive["header"] = {"type": "text", "text": header[:60]}
    if footer:
        interactive["footer"] = {"type": "text", "text": footer[:60]}
        
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "interactive",
        "interactive": interactive
    }
    return await _send_payload(phone_number, payload)

async def mark_as_read(phone_number: str, msg_id: str) -> bool:
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": msg_id
    }
    return await _send_payload(phone_number, payload)

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
    if msg_type == "location":
        loc = message.get("location", {})
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        if lat is not None and lng is not None:
            return f"coords:{lat},{lng}", "location"
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

async def send_language_list(phone_number: str) -> bool:
    sections = [
        {
            "title": "Languages",
            "rows": [
                {"id": "1", "title": "English", "description": "Choose English"},
                {"id": "2", "title": "Kiswahili", "description": "Chagua Kiswahili"},
                {"id": "3", "title": "Luganda", "description": "Londa Oluganda"},
                {"id": "4", "title": "French", "description": "Choisir le Français"},
                {"id": "5", "title": "Kinyarwanda", "description": "Hitamo Ikinyarwanda"},
            ]
        }
    ]
    return await send_list(
        phone_number,
        body="Welcome to ContraBot. Choose language / Karibu kwenye ContraBot. Chagua lugha:",
        button_label="Select Language",
        sections=sections
    )

async def handle_whatsapp_webhook(request: Request) -> JSONResponse:
    body_bytes = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")
    
    if not verify_signature(body_bytes, signature):
        logger.error("Signature verification failed", extra={"signature": signature})
        return JSONResponse({"error": "Signature verification failed"}, status_code=403)
        
    try:
        data = json.loads(body_bytes)
    except Exception as exc:
        logger.error(f"Malformed JSON payload: {exc}")
        return JSONResponse({"error": "Malformed JSON"}, status_code=400)
        
    try:
        value = data["entry"][0]["changes"][0]["value"]
    except (KeyError, IndexError):
        return JSONResponse({"status": "received"}, status_code=200)

    # Process status callbacks
    if "statuses" in value:
        for status in value["statuses"]:
            status_id = status.get("id")
            recipient_id = status.get("recipient_id")
            status_type = status.get("status")
            if status_type == "failed":
                errors = status.get("errors", [])
                err_msg = errors[0].get("message") if errors else "Unknown error"
                logger.error(
                    f"Message delivery failed to {recipient_id}: {err_msg}",
                    extra={"phone": recipient_id, "msg_id": status_id}
                )
            else:
                logger.info(
                    f"Message status update: {status_type} for {recipient_id}",
                    extra={"phone": recipient_id, "msg_id": status_id}
                )
        return JSONResponse({"status": "received"}, status_code=200)

    if "messages" not in value:
        return JSONResponse({"status": "received"}, status_code=200)

    for message in value["messages"]:
        msg_id = message.get("id")
        phone_number = message["from"]
        
        if is_duplicate_message(msg_id):
            logger.info("Skipping duplicate message", extra={"phone": phone_number, "msg_id": msg_id})
            continue

        # Mark message as read
        await mark_as_read(phone_number, msg_id)

        body, msg_kind = _extract_message_body(message)
        session_id = phone_number
        session = session_store.get(session_id, CHANNEL)
        
        logger.info(
            f"Received WhatsApp message of type '{msg_kind}'",
            extra={"phone": phone_number, "session_id": session_id, "stage": session.get("stage") if session else None}
        )

        # Handle unsupported media messages (graceful fallback)
        if not body and msg_kind in ("image", "document", "audio", "video", "sticker", "voice"):
            if not session:
                await send_text(
                    phone_number, 
                    "Welcome to ContraBot. I can only process text or list selections. Please type 'start' or 'hi' to begin."
                )
            else:
                await send_text(
                    phone_number, 
                    "Thanks, but I can only process text questions or button options. Please send a text message."
                )
            continue

        # Command detection to restart session at any point
        if body.lower() in ("restart", "menu", "start over", "new"):
            session_store.delete(session_id, CHANNEL)
            session = new_session(phone_number, CHANNEL)
            session_store.set(session_id, session, CHANNEL, ttl=1800)
            await send_language_list(phone_number)
            continue

        # If welcome or hello sent, and no session, start session
        if not session and msg_kind == "text":
            detected = _detect_language(body)
            session = new_session(phone_number, CHANNEL)
            session["language"] = detected if detected in LANGUAGE_LABELS else "english"
            session_store.set(session_id, session, CHANNEL, ttl=1800)
            await send_buttons(
                phone_number,
                f"Welcome to ContraBot ({session['language'].capitalize()}). Start counseling?",
                [("start", "Start"), ("help", "Help")],
            )
            continue

        # Generic hello when already in a session but at the starting gate
        if body.lower() in ("help", "hi", "hello") and not session:
            await send_text(phone_number, "ContraBot helps you find safe contraception. Reply Start to begin.")
            continue

        if not session:
            # Fallback if somehow ended up here without a session
            session = new_session(phone_number, CHANNEL)
            session_store.set(session_id, session, CHANNEL, ttl=1800)
            await send_language_list(phone_number)
            continue

        # Handle welcome button response
        if body.lower() in ("start", "1") and session.get("stage") == "language":
            await send_language_list(phone_number)
            continue

        # Handle coordinate lookup in awaiting_facility stage
        if session.get("awaiting_facility") and msg_kind == "location" and body.startswith("coords:"):
            try:
                coords_part = body.replace("coords:", "")
                lat_str, lng_str = coords_part.split(",")
                lat, lng = float(lat_str), float(lng_str)
                from services.facilities import find_facilities_by_coords, format_facilities_message
                facilities = find_facilities_by_coords(lat, lng)
                reply = format_facilities_message(facilities, max_chars=300)
                
                # Update session to chat mode
                session["stage"] = "chat"
                session["awaiting_facility"] = False
                session_store.set(session_id, session, CHANNEL, ttl=1800)
                
                await send_text(phone_number, reply)
                await send_text(
                    phone_number,
                    "You are now in free-form chat mode. You can ask me any questions about side effects, contraception methods, or type 'restart' to start over."
                )
                continue
            except Exception as exc:
                logger.error(f"Error handling location coordinates: {exc}", extra={"phone": phone_number})
                await send_text(phone_number, "Sorry, I had trouble parsing your location. Please type your district name.")
                continue

        # Free-form AI Chat stage
        if session.get("stage") == "chat":
            if msg_kind in ("image", "document", "audio", "video", "sticker", "voice"):
                await send_text(phone_number, "I can only process text questions in chat mode. Please type your message.")
                continue
                
            lang = session.get("language", "english")
            try:
                # Query RAG context
                rag = query_all_collections(body, num_results=2)
                context = "\n".join(rag[:2]) if rag else ""
                system = load_system_prompt()
                
                reply = chat_completion(
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": f"Context:\n{context}\n\nUser ({lang}): {body}"},
                    ],
                    max_tokens=300,
                    temperature=0.6,
                )
                await send_text(phone_number, reply.strip()[:300])
            except Exception as exc:
                logger.error(f"Chat completion failed: {exc}", extra={"phone": phone_number})
                await send_text(
                    phone_number,
                    "I'm sorry, I'm having trouble processing that query right now. Feel free to try again or type 'restart' to start over."
                )
            continue

        # Standard intake flow processing
        normalized = _normalize_button_input(body)
        try:
            session, reply, end = process_intake_input(session, normalized)
        except Exception as exc:
            logger.error(f"Error in process_intake_input: {exc}", extra={"phone": phone_number}, exc_info=True)
            await send_text(
                phone_number, 
                "An unexpected error occurred. Let's restart the conversation."
            )
            session_store.delete(session_id, CHANNEL)
            continue

        if end:
            # Transition to chat mode instead of deleting session
            await send_text(phone_number, reply)
            
            session["stage"] = "chat"
            session["awaiting_facility"] = False
            session_store.set(session_id, session, CHANNEL, ttl=1800)
            
            await send_text(
                phone_number,
                "You are now in free-form chat mode. You can ask me any questions about side effects, contraception methods, or type 'restart' to start over."
            )
            continue

        # Save updated session
        session_store.set(session_id, session, CHANNEL, ttl=1800)

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
                await send_buttons(phone_number, text, buttons)
                continue

        if session.get("awaiting_facility"):
            await send_buttons(phone_number, reply, [("facility_yes", "Find clinic"), ("facility_no", "Done")])
        else:
            await send_text(phone_number, reply)

    return JSONResponse({"status": "received"}, status_code=200)

async def verify_whatsapp_webhook(request: Request) -> JSONResponse:
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and verify_webhook_token(token):
        return JSONResponse(content=int(challenge), status_code=200)

    return JSONResponse({"error": "Verification failed"}, status_code=403)
