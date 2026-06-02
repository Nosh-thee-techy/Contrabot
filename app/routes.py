"""API routes for recommend, chat, facilities, and CHW outcomes."""

from fastapi import APIRouter, HTTPException

from engine.models import ChatRequest, OutcomeLog, RecommendRequest, UserProfile, METHOD_LABELS, METHOD_METADATA
from engine.pipeline import run_recommendation
from services.facilities import find_nearest_facilities, format_facilities_message, get_outcome_analytics, log_outcome
from services.knowledge import query_all_collections
from engine.recommender import load_system_prompt
from app.openai_client import chat_completion

router = APIRouter()


@router.post("/recommend")
def recommend(body: RecommendRequest):
    result = run_recommendation(body.profile)
    return result.model_dump()


@router.post("/chat")
def chat(body: ChatRequest):
    rag = query_all_collections(body.message, num_results=2)
    profile = body.profile or UserProfile(age=25, channel="web")
    system = load_system_prompt()
    context = "\n".join(rag[:2]) if rag else ""
    try:
        reply = chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": f"Context:\n{context}\n\nUser: {body.message}"},
            ],
            max_tokens=400,
            temperature=0.6,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"reply": reply, "session_id": body.session_id}


@router.get("/facilities")
def facilities(district: str, country: str | None = None, limit: int = 3):
    items = find_nearest_facilities(district, limit=limit, country=country)
    return {"district": district, "facilities": items, "formatted": format_facilities_message(items, max_chars=500)}


@router.post("/outcomes")
def outcomes(body: OutcomeLog):
    ok = log_outcome(body.district, body.recommended_method, body.accepted, body.chosen_method, body.notes)
    if not ok:
        raise HTTPException(status_code=500, detail="Could not log outcome")
    return {"status": "logged"}


@router.get("/analytics/outcomes")
def analytics_outcomes():
    return get_outcome_analytics()


@router.get("/methods/compare")
def compare_methods():
    rows = []
    for method, label in METHOD_LABELS.items():
        meta = METHOD_METADATA[method]
        rows.append(
            {
                "id": method.value,
                "name": label,
                "duration": meta["duration"],
                "cost": meta["cost"],
                "effectiveness": meta["effectiveness"],
                "reversibility": meta["reversibility"],
                "requires_clinic": meta["requires_clinic"],
            }
        )
    return {"methods": rows}
