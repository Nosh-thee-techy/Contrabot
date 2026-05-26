from fastapi.responses import PlainTextResponse
import time
from typing import Dict, List

SESSION_TIMEOUT_SECS = 300
ussd_sessions: Dict[str, Dict] = {}

LANGUAGE_OPTIONS = {
    "1": "English",
    "2": "Kiswahili",
    "3": "Luganda",
    "4": "French",
    "5": "Kinyarwanda",
}


def clean_expired_sessions() -> None:
    now = time.time()
    expired = [sid for sid, session in ussd_sessions.items() if now - session.get("updated_at", 0) > SESSION_TIMEOUT_SECS]
    for sid in expired:
        del ussd_sessions[sid]


def get_session(session_id: str) -> Dict:
    clean_expired_sessions()
    session = ussd_sessions.get(session_id)
    if session:
        session["updated_at"] = time.time()
    return session


def save_session(session_id: str, session_data: Dict) -> None:
    session_data["updated_at"] = time.time()
    ussd_sessions[session_id] = session_data


def build_response(message: str, end: bool = False) -> PlainTextResponse:
    prefix = "END" if end else "CON"
    return PlainTextResponse(f"{prefix} {message}", media_type="text/plain")


def parse_ussd_text(text: str) -> List[str]:
    if text is None:
        return []
    normalized = text.strip()
    return [part for part in normalized.split("*") if part != ""]


def get_initial_menu() -> str:
    return (
        "Welcome to ContraBot. Please choose your language:\n"
        "1. English\n"
        "2. Kiswahili\n"
        "3. Luganda\n"
        "4. French\n"
        "5. Kinyarwanda"
    )


def get_question_for_step(step: int, language: str) -> str:
    questions = {
        1: "Enter your age (years):",
        2: "Have you ever been pregnant or given birth?\n1. Yes\n2. No",
        3: "Are you breastfeeding a baby under 6 months?\n1. Yes\n2. No",
        4: "Do you have hypertension, migraines with aura, or a history of blood clots?\n1. Yes\n2. No",
        5: "Do you prefer a daily pill or a set-and-forget method?\n1. Daily pill\n2. Set-and-forget",
    }
    return questions.get(step, "Thank you.")


def build_recommendation(profile: Dict[str, str]) -> str:
    age = profile.get("age")
    parity = profile.get("parity")
    breastfeeding = profile.get("breastfeeding")
    health_flags = profile.get("health_flags")
    preference = profile.get("preference")

    recommendation = "Based on your answers, we suggest: "
    method = "progestogen-only pill"
    explanation = "This method is safe if you have health concerns and works well for postpartum or breastfeeding women."

    if preference == "2":
        method = "injectable or implant"
        explanation = "A set-and-forget option may be easier if you want fewer daily steps."
    if health_flags == "1":
        method = "progestogen-only pill or non-hormonal method"
        explanation = "Combined hormonal methods are not recommended with your reported health conditions."
    if breastfeeding == "1":
        method = "progestogen-only pill or implant"
        explanation = "These are generally safer while breastfeeding under 6 months."

    return (
        f"{recommendation}{method}. {explanation} "
        "Please visit a clinic or CHW to confirm your choice."
    )


def handle_ussd_input(session_id: str, text: str, phone_number: str) -> PlainTextResponse:
    inputs = parse_ussd_text(text)
    session = get_session(session_id) or {"phone_number": phone_number, "profile": {}}

    if not inputs:
        session["stage"] = "language"
        save_session(session_id, session)
        return build_response(get_initial_menu())

    if len(inputs) == 1:
        choice = inputs[0]
        if choice not in LANGUAGE_OPTIONS:
            return build_response("Invalid choice. " + get_initial_menu())
        session["language"] = LANGUAGE_OPTIONS[choice]
        session["stage"] = "age"
        save_session(session_id, session)
        return build_response(get_question_for_step(1, session["language"]))

    if len(inputs) == 2:
        age = inputs[1]
        if not age.isdigit() or int(age) <= 0 or int(age) > 120:
            return build_response("Please enter a valid age in years:")
        session["profile"]["age"] = age
        session["stage"] = "parity"
        save_session(session_id, session)
        return build_response(get_question_for_step(2, session["language"]))

    if len(inputs) == 3:
        parity = inputs[2]
        if parity not in {"1", "2"}:
            return build_response("Please choose 1 or 2:\n1. Yes\n2. No")
        session["profile"]["parity"] = "yes" if parity == "1" else "no"
        session["stage"] = "breastfeeding"
        save_session(session_id, session)
        return build_response(get_question_for_step(3, session["language"]))

    if len(inputs) == 4:
        breastfeeding = inputs[3]
        if breastfeeding not in {"1", "2"}:
            return build_response("Please choose 1 or 2:\n1. Yes\n2. No")
        session["profile"]["breastfeeding"] = "yes" if breastfeeding == "1" else "no"
        session["stage"] = "health_flags"
        save_session(session_id, session)
        return build_response(get_question_for_step(4, session["language"]))

    if len(inputs) == 5:
        health_flags = inputs[4]
        if health_flags not in {"1", "2"}:
            return build_response("Please choose 1 or 2:\n1. Yes\n2. No")
        session["profile"]["health_flags"] = "yes" if health_flags == "1" else "no"
        session["stage"] = "preference"
        save_session(session_id, session)
        return build_response(get_question_for_step(5, session["language"]))

    if len(inputs) == 6:
        preference = inputs[5]
        if preference not in {"1", "2"}:
            return build_response("Please choose 1 or 2:\n1. Daily pill\n2. Set-and-forget")
        session["profile"]["preference"] = "daily" if preference == "1" else "set-and-forget"
        recommendation = build_recommendation(session["profile"])
        ussd_sessions.pop(session_id, None)
        return build_response(recommendation, end=True)

    return build_response("Session error. Please start again by dialing your USSD code.", end=True)
