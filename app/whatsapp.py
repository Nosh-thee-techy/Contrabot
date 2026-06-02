"""Backward-compatible re-exports."""
from channels.whatsapp import handle_whatsapp_webhook, verify_whatsapp_webhook, send_text as send_message

__all__ = ["handle_whatsapp_webhook", "verify_whatsapp_webhook", "send_message"]
