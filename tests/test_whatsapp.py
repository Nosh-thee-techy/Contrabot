import json
import hmac
import hashlib
import time
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request
from fastapi.responses import JSONResponse

from channels.whatsapp import (
    verify_webhook_token,
    verify_signature,
    is_duplicate_message,
    _extract_message_body,
    _normalize_button_input,
    handle_whatsapp_webhook,
    verify_whatsapp_webhook,
    DEDUP_CACHE
)
from services.session import session_store

# Mock FastAPI Request helper
def make_mock_request(method: str, body_bytes: bytes, headers: dict = None, query_params: dict = None) -> Request:
    request = MagicMock(spec=Request)
    request.method = method
    
    # Async body retrieval
    async def body():
        return body_bytes
    request.body = body
    
    request.headers = headers or {}
    request.query_params = query_params or {}
    return request

@pytest.fixture(autouse=True)
def clear_caches_and_sessions():
    DEDUP_CACHE.clear()
    session_store._memory.clear()
    # Ensure local in-memory fallback is active for test simplicity
    session_store._use_redis = False

def test_verify_webhook_token():
    with patch("channels.whatsapp.WHATSAPP_VERIFY_TOKEN", "test_token"):
        assert verify_webhook_token("test_token") is True
        assert verify_webhook_token("wrong_token") is False

def test_verify_signature():
    body = b"hello world"
    secret = "my_app_secret"
    expected_sig = "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    
    with patch("channels.whatsapp.WHATSAPP_APP_SECRET", secret):
        assert verify_signature(body, expected_sig) is True
        assert verify_signature(body, "sha256=wrong_sig") is False
        assert verify_signature(body, None) is False
        assert verify_signature(body, "invalid_format") is False

def test_verify_signature_not_configured():
    # If app secret is not set (or matches placeholder), verify_signature should return True with a warning
    with patch("channels.whatsapp.WHATSAPP_APP_SECRET", ""):
        assert verify_signature(b"any_body", "sha256=any_sig") is True

def test_is_duplicate_message():
    assert is_duplicate_message("msg_1") is False
    assert is_duplicate_message("msg_1") is True
    assert is_duplicate_message("msg_2") is False

def test_extract_message_body():
    # Text message
    msg = {"type": "text", "text": {"body": "hello"}}
    body, kind = _extract_message_body(msg)
    assert body == "hello"
    assert kind == "text"
    
    # Button message
    msg = {"type": "interactive", "interactive": {"type": "button_reply", "button_reply": {"id": "btn_1"}}}
    body, kind = _extract_message_body(msg)
    assert body == "btn_1"
    assert kind == "button"
    
    # List message
    msg = {"type": "interactive", "interactive": {"type": "list_reply", "list_reply": {"id": "lst_1"}}}
    body, kind = _extract_message_body(msg)
    assert body == "lst_1"
    assert kind == "list"
    
    # Location message
    msg = {"type": "location", "location": {"latitude": 1.23, "longitude": 4.56}}
    body, kind = _extract_message_body(msg)
    assert body == "coords:1.23,4.56"
    assert kind == "location"

def test_normalize_button_input():
    assert _normalize_button_input("breastfeeding_yes") == "1"
    assert _normalize_button_input("breastfeeding_no") == "2"
    assert _normalize_button_input("daily") == "1"
    assert _normalize_button_input("any_other") == "any_other"

@pytest.mark.asyncio
async def test_verify_whatsapp_webhook_success():
    req = make_mock_request("GET", b"", query_params={
        "hub.mode": "subscribe",
        "hub.verify_token": "test_token",
        "hub.challenge": "12345"
    })
    
    with patch("channels.whatsapp.WHATSAPP_VERIFY_TOKEN", "test_token"):
        resp = await verify_whatsapp_webhook(req)
        assert resp.status_code == 200
        assert json.loads(resp.body) == 12345

@pytest.mark.asyncio
async def test_verify_whatsapp_webhook_failure():
    req = make_mock_request("GET", b"", query_params={
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong_token",
        "hub.challenge": "12345"
    })
    
    with patch("channels.whatsapp.WHATSAPP_VERIFY_TOKEN", "test_token"):
        resp = await verify_whatsapp_webhook(req)
        assert resp.status_code == 403

@pytest.mark.asyncio
async def test_handle_whatsapp_webhook_signature_failure():
    req = make_mock_request(
        "POST", 
        b'{"object":"whatsapp"}', 
        headers={"X-Hub-Signature-256": "sha256=invalid"}
    )
    with patch("channels.whatsapp.WHATSAPP_APP_SECRET", "secret"):
        resp = await handle_whatsapp_webhook(req)
        assert resp.status_code == 403

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
async def test_handle_whatsapp_webhook_status_callback(mock_send):
    status_payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "statuses": [{
                        "id": "status_id_1",
                        "recipient_id": "254700000000",
                        "status": "delivered"
                    }]
                }
            }]
        }]
    }
    req = make_mock_request("POST", json.dumps(status_payload).encode())
    resp = await handle_whatsapp_webhook(req)
    assert resp.status_code == 200
    assert json.loads(resp.body) == {"status": "received"}
    mock_send.assert_not_called()

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
async def test_handle_whatsapp_webhook_unsupported_media(mock_send):
    mock_send.return_value = True
    media_payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "msg_media_1",
                        "from": "254700000000",
                        "type": "image",
                        "image": {"id": "img_id"}
                    }]
                }
            }]
        }]
    }
    req = make_mock_request("POST", json.dumps(media_payload).encode())
    resp = await handle_whatsapp_webhook(req)
    assert resp.status_code == 200
    
    # Verify we sent the unsupported media message fallback (after marking read)
    assert mock_send.call_count == 2
    sent_payload = mock_send.call_args_list[1][0][1]
    assert "text" in sent_payload
    assert "Welcome to ContraBot. I can only process text or list selections" in sent_payload["text"]["body"]

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
async def test_handle_whatsapp_webhook_start_flow(mock_send):
    mock_send.return_value = True
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "msg_start_1",
                        "from": "254700000000",
                        "type": "text",
                        "text": {"body": "hello"}
                    }]
                }
            }]
        }]
    }
    req = make_mock_request("POST", json.dumps(payload).encode())
    resp = await handle_whatsapp_webhook(req)
    assert resp.status_code == 200
    
    # Welcome buttons should be sent (after marking read)
    assert mock_send.call_count == 2
    sent_payload = mock_send.call_args_list[1][0][1]
    assert sent_payload["interactive"]["type"] == "button"
    assert "Start counseling?" in sent_payload["interactive"]["body"]["text"]

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
async def test_handle_whatsapp_webhook_language_list(mock_send):
    mock_send.return_value = True
    # Establish session
    session_store.set("254700000000", {
        "phone_number": "254700000000",
        "channel": "whatsapp",
        "stage": "language",
        "language": "english",
        "profile": {}
    }, "whatsapp")
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "msg_lang_1",
                        "from": "254700000000",
                        "type": "text",
                        "text": {"body": "start"}
                    }]
                }
            }]
        }]
    }
    req = make_mock_request("POST", json.dumps(payload).encode())
    resp = await handle_whatsapp_webhook(req)
    assert resp.status_code == 200
    
    # Language list message should be sent (after marking read)
    assert mock_send.call_count == 2
    sent_payload = mock_send.call_args_list[1][0][1]
    assert sent_payload["interactive"]["type"] == "list"
    assert "Choose language" in sent_payload["interactive"]["body"]["text"]

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
async def test_handle_whatsapp_webhook_location_lookup(mock_send):
    mock_send.return_value = True
    # Establish session awaiting facility
    session_store.set("254700000000", {
        "phone_number": "254700000000",
        "channel": "whatsapp",
        "stage": "facility_lookup",
        "language": "english",
        "profile": {"district": "Nairobi"},
        "awaiting_facility": True
    }, "whatsapp")
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "msg_loc_1",
                        "from": "254700000000",
                        "type": "location",
                        "location": {"latitude": -1.28, "longitude": 36.82}
                    }]
                }
            }]
        }]
    }
    
    # Mock database and find_facilities_by_coords
    mock_facilities = [{"name": "Clinic A", "district": "Nairobi", "phone": "1234", "services": "FP", "lat": -1.28, "lng": 36.82}]
    with patch("services.facilities.find_facilities_by_coords", return_value=mock_facilities):
        req = make_mock_request("POST", json.dumps(payload).encode())
        resp = await handle_whatsapp_webhook(req)
        assert resp.status_code == 200
        
        # Verify 3 messages sent: read receipt, facilities list, and chat mode welcome
        assert mock_send.call_count == 3
        
        # Check session is updated to chat mode
        sess = session_store.get("254700000000", "whatsapp")
        assert sess["stage"] == "chat"
        assert sess["awaiting_facility"] is False

@pytest.mark.asyncio
@patch("channels.whatsapp._send_payload", new_callable=AsyncMock)
@patch("channels.whatsapp.chat_completion")
async def test_handle_whatsapp_webhook_chat_mode(mock_chat, mock_send):
    mock_send.return_value = True
    mock_chat.return_value = "This is an AI response about side effects."
    
    # Establish session in chat stage
    session_store.set("254700000000", {
        "phone_number": "254700000000",
        "channel": "whatsapp",
        "stage": "chat",
        "language": "english",
        "profile": {}
    }, "whatsapp")
    
    payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "id": "msg_chat_1",
                        "from": "254700000000",
                        "type": "text",
                        "text": {"body": "Tell me about pill side effects"}
                    }]
                }
            }]
        }]
    }
    
    with patch("services.knowledge.query_all_collections", return_value=["Some context"]):
        req = make_mock_request("POST", json.dumps(payload).encode())
        resp = await handle_whatsapp_webhook(req)
        assert resp.status_code == 200
        
        # Verify AI reply was sent (after marking read)
        assert mock_send.call_count == 2
        sent_payload = mock_send.call_args_list[1][0][1]
        assert sent_payload["text"]["body"] == "This is an AI response about side effects."
