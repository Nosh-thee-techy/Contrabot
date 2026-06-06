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
    "6": "sheng",
}

LANGUAGE_LABELS = {
    "english": "English",
    "kiswahili": "Kiswahili",
    "luganda": "Luganda",
    "french": "French",
    "kinyarwanda": "Kinyarwanda",
    "sheng": "Sheng",
}

STAGES = [
    "language",
    "name",
    "gender",
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
        name=p.get("name"),
        gender=p.get("gender", "female"),
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
    lang = (language or "english").lower()
    prompts = {
        "english": {
            "language": (
                "Welcome to ContraBot. Choose language:\n"
                "1. English  2. Kiswahili  3. Luganda\n4. French  5. Kinyarwanda  6. Sheng"
            ),
            "name": "What should we call you? (Enter your name):",
            "gender": "What is your gender?\n1. Female  2. Male",
            "age": "Enter your age (years):",
            "breastfeeding": "Breastfeeding baby under 6 months?\n1. Yes  2. No",
            "health_flags": "Hypertension, migraine w/ aura, or blood clots?\n1. Yes  2. No",
            "preference": "Prefer daily pill or set-and-forget?\n1. Daily  2. Set-and-forget",
            "access": "Can you visit a clinic for FP services?\n1. Yes  2. No",
            "district": "Enter your district (e.g. Nairobi, Kampala):",
            "facility_offer": "Find nearest clinic?\n1. Yes  2. No",
        },
        "kiswahili": {
            "language": (
                "Karibu kwenye ContraBot. Chagua lugha:\n"
                "1. English  2. Kiswahili  3. Luganda\n4. French  5. Kinyarwanda  6. Sheng"
            ),
            "name": "Je, unaitwa nani? (Andika jina lako):",
            "gender": "Je, jinsia yako ni gani?\n1. Kike  2. Kiume",
            "age": "Tafadhali andika umri wako (miaka):",
            "breastfeeding": "Je, unanyonyesha mtoto aliye chini ya miezi 6?\n1. Ndio  2. La",
            "health_flags": "Je, una shinikizo la damu, maumivu makali ya kichwa, au historia ya kuganda kwa damu?\n1. Ndio  2. La",
            "preference": "Je, unapendelea vidonge vya kila siku au njia ya muda mrefu (ya kuweka na kusahau)?\n1. Kila siku  2. Njia ya muda mrefu",
            "access": "Je, unaweza kutembelea kliniki kwa huduma za uzazi wa mpango?\n1. Ndio  2. La",
            "district": "Tafadhali andika wilaya yako (mfano: Nairobi, Kampala):",
            "facility_offer": "Je, ungependa kupata kliniki iliyo karibu nawe?\n1. Ndio  2. La",
        },
        "sheng": {
            "language": (
                "Karibu ContraBot. Chagua lugha msee:\n"
                "1. English  2. Kiswahili  3. Luganda\n4. French  5. Kinyarwanda  6. Sheng"
            ),
            "name": "Uko rada? Unaitwa nani mbogi? (Andika jina yako):",
            "gender": "Jinsia yako ni gani msee?\n1. Dem  2. Chali",
            "age": "Uko na miaka ngapi msee? (Andika age yako):",
            "breastfeeding": "Uko na mtoi ananyonya chini ya miezi sita?\n1. Ndio  2. Zii",
            "health_flags": "Uko na pressure ya juu, kichwa kuuma sana, au shida ya damu kuganda?\n1. Ndio  2. Zii",
            "preference": "Unataka chapo ya kila siku (vidonge) ama ile ya kuweka na kusahau (muda mrefu)?\n1. Kila siku  2. Muda mrefu",
            "access": "Unaweza fika klabu/kliniki kupata huduma za uzazi wa mpango?\n1. Ndio  2. Zii",
            "district": "Uko mtaa gani? (Mfano: Nairobi, Kampala):",
            "facility_offer": "Nikuonyeshe kliniki iliyo karibu nawe?\n1. Ndio  2. Zii",
        }
    }
    lang_prompts = prompts.get(lang, prompts["english"])
    return lang_prompts.get(stage, prompts["english"].get(stage, "Thank you."))


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
    lang = session.get("language", "english")

    if session.get("awaiting_facility"):
        if text in ("1", "yes", "y"):
            district = profile.get("district", "Nairobi")
            facilities = find_nearest_facilities(district)
            msg = format_facilities_message(facilities, max_chars=max_chars)
            session["awaiting_facility"] = False
            return session, msg, True
        
        thank_you = (
            "Thank you. Visit a CHW when ready." if lang == "english"
            else "Asante. Tembelea CHW ukiwa tayari." if lang == "kiswahili"
            else "Shukran msee. Tembelea CHW ukiget rada."
        )
        return session, thank_you, True

    if stage == "language":
        selected_lang = LANGUAGE_OPTIONS.get(text, "english" if text.lower() in LANGUAGE_LABELS else None)
        if not selected_lang:
            return session, "Invalid. " + get_prompt_for_stage("language", "english"), False
        session["language"] = selected_lang
        session["stage"] = "name"
        return session, get_prompt_for_stage("name", selected_lang), False

    if stage == "name":
        if len(text) < 2:
            invalid_name = (
                "Please enter a valid name:" if lang == "english"
                else "Tafadhali andika jina halali:" if lang == "kiswahili"
                else "Andika jina poa msee:"
            )
            return session, invalid_name, False
        profile["name"] = text
        session["stage"] = "gender"
        return session, get_prompt_for_stage("gender", lang), False

    if stage == "gender":
        if text not in ("1", "2", "female", "male"):
            return session, get_prompt_for_stage("gender", lang), False
        gender_val = "female" if text in ("1", "female") else "male"
        profile["gender"] = gender_val
        session["stage"] = "age"
        return session, get_prompt_for_stage("age", lang), False

    if stage == "age":
        if not text.isdigit() or not (10 <= int(text) <= 55):
            invalid_age = (
                "Enter a valid age (10-55):" if lang == "english"
                else "Tafadhali andika umri halali (10-55):" if lang == "kiswahili"
                else "Andika age halali msee (10-55):"
            )
            return session, invalid_age, False
        profile["age"] = text
        
        if profile.get("gender") == "male":
            session["stage"] = "access"
            return session, get_prompt_for_stage("access", lang), False
        else:
            session["stage"] = "breastfeeding"
            return session, get_prompt_for_stage("breastfeeding", lang), False

    if stage == "breastfeeding":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("breastfeeding", lang), False
        profile["breastfeeding"] = "yes" if text == "1" else "no"
        session["stage"] = "health_flags"
        return session, get_prompt_for_stage("health_flags", lang), False

    if stage == "health_flags":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("health_flags", lang), False
        profile["health_flags"] = "yes" if text == "1" else "no"
        session["stage"] = "preference"
        return session, get_prompt_for_stage("preference", lang), False

    if stage == "preference":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("preference", lang), False
        profile["preference"] = "daily" if text == "1" else "long_acting"
        session["stage"] = "access"
        return session, get_prompt_for_stage("access", lang), False

    if stage == "access":
        if text not in ("1", "2"):
            return session, get_prompt_for_stage("access", lang), False
        profile["clinic_access"] = "yes" if text == "1" else "no"
        session["stage"] = "district"
        return session, get_prompt_for_stage("district", lang), False

    if stage == "district":
        if len(text) < 2:
            invalid_district = (
                "Please enter your district name:" if lang == "english"
                else "Tafadhali andika jina la wilaya yako:" if lang == "kiswahili"
                else "Andika jina ya mtaa yako msee:"
            )
            return session, invalid_district, False
        profile["district"] = text
        session["stage"] = "recommendation"
        user_profile = profile_from_session(session)
        result = run_recommendation(user_profile)
        session["last_recommendation"] = result.model_dump()
        rec = result.recommendation_text[:max_chars]
        if channel == "ussd":
            session["awaiting_facility"] = True
            find_clinic_prompt = (
                "\nFind clinic?\n1. Yes  2. No" if lang == "english"
                else "\nPata kliniki?\n1. Ndio  2. La" if lang == "kiswahili"
                else "\nKupata kliniki?\n1. Ndio  2. Zii"
            )
            return session, rec + find_clinic_prompt, False
        
        session["awaiting_facility"] = True
        find_clinic_prompt = (
            "\n\nReply 1 to find nearest clinic, 2 to finish." if lang == "english"
            else "\n\nJibu 1 kupata kliniki iliyo karibu, 2 kumaliza." if lang == "kiswahili"
            else "\n\nJibu 1 kuona kliniki karibu nawe, 2 kumaliza."
        )
        return session, rec + find_clinic_prompt, False

    return session, "Session error. Please start again.", True
