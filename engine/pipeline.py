from engine.models import RecommendationResult, UserProfile
from engine.recommender import generate_recommendation
from engine.safety_screen import screen_methods
from engine.scorer import rank_methods
from services.knowledge import query_all_collections


def run_recommendation(profile: UserProfile) -> RecommendationResult:
    """Full pipeline: safety screen → score → RAG → LLM."""
    safety = screen_methods(profile)
    ranked = rank_methods(profile, safety)

    query_parts = [
        f"contraception for age {profile.age}",
        "breastfeeding" if profile.breastfeeding else "",
        "health contraindications" if profile.health_risk else "",
        profile.preference,
        profile.region or profile.district or "East Africa",
    ]
    rag_query = " ".join(p for p in query_parts if p)
    rag_context = query_all_collections(rag_query, num_results=2)

    return generate_recommendation(profile, safety, ranked, rag_context)
