from fastapi import FastAPI, Request
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
import os

from app.ussd import handle_ussd_input

load_dotenv()

app = FastAPI(title="ContraBot", version="0.1.0")


@app.get("/")
async def root():
    return {"status": "ok", "message": "ContraBot backend is running."}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ussd")
@app.get("/ussd")
async def ussd_webhook(request: Request):
    form = await request.form()
    params = request.query_params

    session_id = form.get("sessionId") or params.get("sessionId")
    service_code = form.get("serviceCode") or params.get("serviceCode")
    phone_number = form.get("phoneNumber") or params.get("phoneNumber")
    text = form.get("text") or params.get("text") or ""

    if not session_id or not phone_number:
        return PlainTextResponse("END Missing required USSD parameters.", media_type="text/plain")

    return handle_ussd_input(session_id, text, phone_number)
