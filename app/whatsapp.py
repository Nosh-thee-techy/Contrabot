from fastapi import Request
from fastapi.responses import JSONResponse
import os
import json
from app.openai_client import chat_completion

WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")


def verify_webhook_token(token: str) -> bool:
    """Verify incoming webhook token from Meta."""
    return token == WHATSAPP_TOKEN


def send_message(phone_number: str, message: str) -> bool:
    """Send a message via WhatsApp API."""
    phone_id = os.getenv("WHATSAPP_PHONE_ID")
    access_token = WHATSAPP_TOKEN

    if not phone_id or not access_token:
        return False

    url = f"https://graph.instagram.com/v17.0/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": phone_number,
        "type": "text",
        "text": {"body": message},
    }

    try:
        import httpx

        response = httpx.post(url, json=payload, headers=headers, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        return False


async def handle_whatsapp_webhook(request: Request) -> JSONResponse:
    """Handle incoming WhatsApp webhook from Meta."""
    data = await request.json()

    if "messages" not in data.get("entry", [{}])[0].get("changes", [{}])[0].get("value", {}):
        return JSONResponse({"status": "received"}, status_code=200)

    messages = data["entry"][0]["changes"][0]["value"]["messages"]
    for message in messages:
        phone_number = message["from"]
        user_message = message.get("text", {}).get("body", "")

        if not user_message:
            continue

        system_prompt = (
            "You are ContraBot, a contraception counselor trained on the WHO Medical Eligibility Criteria (MEC). "
            "Provide personalized, evidence-based information about contraceptive methods. "
            "Never diagnose medical conditions or prescribe medication. Always recommend clinic or CHW confirmation. "
            "Keep responses friendly, non-judgmental, and under 300 characters when possible."
        )

        try:
            response_text = chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                model="gpt-3.5-turbo",
                temperature=0.7,
                max_tokens=300,
            )

            send_message(phone_number, response_text)
        except Exception as e:
            print(f"Error processing WhatsApp message: {e}")
            send_message(phone_number, "I encountered an error. Please try again or contact support.")

    return JSONResponse({"status": "received"}, status_code=200)


async def verify_whatsapp_webhook(request: Request) -> JSONResponse:
    """Verify webhook token with Meta."""
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and verify_webhook_token(token):
        return JSONResponse(int(challenge), status_code=200)

    return JSONResponse({"error": "Verification failed"}, status_code=403)
