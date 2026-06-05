import logging
import json
import hashlib
from typing import Any, Optional

# Mask phone number for privacy
def mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "unknown"
    # Keep only last 4 digits, or hash it if short
    clean = "".join(c for c in phone if c.isdigit())
    if len(clean) >= 4:
        return f"***{clean[-4:]}"
    # fallback to a short hash
    return hashlib.md5(phone.encode()).hexdigest()[:8]

class WhatsAppJSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        
        # Add extra fields if they exist
        if hasattr(record, "phone"):
            log_data["phone_masked"] = mask_phone(record.phone)
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        if hasattr(record, "stage"):
            log_data["stage"] = record.stage
        if hasattr(record, "msg_id"):
            log_data["msg_id"] = record.msg_id
            
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        return json.dumps(log_data)

# Setup logger
logger = logging.getLogger("contrabot.whatsapp")
logger.setLevel(logging.INFO)

# Avoid adding duplicate handlers if logger is imported multiple times
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = WhatsAppJSONFormatter()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
