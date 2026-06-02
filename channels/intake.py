"""Shared intake state machine for USSD and WhatsApp channels."""

from engine.models import UserProfile
from engine.pipeline import run_recommendation
from services.facilities import find_nearest_facilities, format_facilities_message

LANGUAGE_OPTIONS = {
    "1": "english",
    "2": "kiswahili",
    "3": "luganda",
    "4": "french",
    "5": "kinyarwanda",
}

LANGUAGE_LABELS = {
    "english": "English",
    "kiswahili": "Kiswahili",
    "luganda": "Luganda",
    "french": "French",
    "kinyarwanda": "Kinyarwanda",
}

STAGES = [
    "language",
    "age",
    "breastfeeding",
    "health_flags",
    "preference",
    "access",
    "district",
    "recommendation",
    "facility_lookup",
]


def new_session(phone: str, channel: str = "ussd") -> dict:
    return {
        "phone_number": phone,
        "channel": channel,
        "stage": "language",
        "language": "english",
        "profile": {},
        "awaiting_facility": False,
    }


def profile_from_session(session: dict) -> UserProfile:
    p = session.get("profile", {})
    return UserProfile(
        age=int(p.get("age", 25)),
        breastfeeding=p.get("breastfeeding") == "yes",
        health_risk=p.get("health_flags") == "yes",
        preference="long_acting" if p.get("preference") == "long_acting" else "daily",
        clinic_access=p.get("clinic_access") != "no",
        parity=p.get("parity") == "yes",
        language=session.get("language", "english"),
        district=p.get("district"),
        region=p.get("region"),
        channel=session.get("channel", "web"),
    )


def get_prompt_for_stage(stage: str, language: str = "english") -> str:
    prompts = {
        "language": (
            "Welcome to ContraBot. Choose language:\n"
            "1. English  2. Kiswahili  3. Luganda\n4. French  5. Kinyarwanda"
        ),
        "age": "Enter your age (years):",
        "breastfeeding": "Breastfeeding baby under 6 months?\n1. Yes  2. No",
        "health_flags": "Hypertension, migraine w/ aura, or blood clots?\n1. Yes  2. No",
        "preference": "Prefer daily pill or set-and-forget?\n1. Daily  2. Set-and-forget",
        "access": "Can you visit a clinic for FP services?\n1. Yes  2. No",
        "district": "Enter your district (e.g. Nairobi, Kampala):",
        "facility_offer": "Find nearest clinic?\n1. Yes  2. No",
    }
    return prompts.get(stage, "Thank you.")


def process_intake_input(session: dict, user_input: str) -> tuple[dict, str, bool]:
    """
    Process one user input in the intake flow.
    Returns (updated_session, response_message, end_session).
    """
    stage = session.get("stage", "language")
    profile = session.setdefault("profile", {})
    text = (user_input or "").strip()
    channel = session.get("channel", "ussd")
    max_chars = 160 if channel == "ussd" else 300

    if session.get("awaiting_facility"):
        if text in ("1", "yes", "y"):
            district = profile.get("district", "Nairobi")
            facilities = find_nearest_facilities(district)
            msg = format_facilities_message(facilities, max_chars=max_chars)
            session["awaiting_facility"] = False
            return session, msg, True
        return session, "Thank you. Visit a CHW when ready.", True

    if stage == "language":
        lang = LANGUAGE_OPTIONS.get(text, "english" if text.lower() in LANGUAGE_LABELS else None)
        if not lang:
            return session, "Invalid. " + get_prompt_for_stage("language"), False
        session["language"] = lang
        session["stage"] = "age"
        return session, get_prompt_for_stage("age"), False

    if stage == "age":
        if not text.isdigit() or not (10 <= int(text) <= 55):
            return session, "Enter a valid age (10-55):", False
        profile["age"] = text
        session["stage"] = "breastfeeding"
        return session, get_prompt_for_stage("breastfeeding"), False

    if stage == "breastfeeding":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("breastfeeding"), False
        profile["breastfeeding"] = "yes" if text == "1" else "no"
        session["stage"] = "health_flags"
        return session, get_prompt_for_stage("health_flags"), False

    if stage == "health_flags":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("health_flags"), False
        profile["health_flags"] = "yes" if text == "1" else "no"
        session["stage"] = "preference"
        return session, get_prompt_for_stage("preference"), False

    if stage == "preference":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("preference"), False
        profile["preference"] = "daily" if text == "1" else "long_acting"
        session["stage"] = "access"
        return session, get_prompt_for_stage("access"), False

    if stage == "access":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("access"), False
        profile["clinic_access"] = "yes" if text == "1" else "no"
        session["stage"] = "district"
        return session, get_prompt_for_stage("district"), False

    if stage == "district":
        if len(text) < 2:
            return session, "Please enter your district name:", False
        profile["district"] = text
        session["stage"] = "recommendation"
        user_profile = profile_from_session(session)
        result = run_recommendation(user_profile)
        session["last_recommendation"] = result.model_dump()
        rec = result.recommendation_text[:max_chars]
        if channel == "ussd":
            session["awaiting_facility"] = True
            return session, rec + "\nFind clinic?\n1. Yes  2. No", False
        session["awaiting_facility"] = True
        return session, rec + "\n\nReply 1 to find nearest clinic, 2 to finish.", False

    return session, "Session error. Please start again.", True
