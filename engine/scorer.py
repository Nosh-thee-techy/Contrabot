"""
5-dimension weighted scoring for contraceptive method ranking.
Dimensions: effectiveness, convenience, cost/access, reversibility, side-effect profile.
"""

from engine.models import (
    ContraceptiveMethod,
    METHOD_LABELS,
    METHOD_METADATA,
    ScoredMethod,
    SafetyScreenResult,
    UserProfile,
)

WEIGHTS = {
    "effectiveness": 0.25,
    "convenience": 0.25,
    "cost_access": 0.20,
    "reversibility": 0.15,
    "side_effects": 0.15,
}


def _convenience_score(method: ContraceptiveMethod, profile: UserProfile) -> float:
    meta = METHOD_METADATA[method]
    if profile.preference == "non_hormonal":
        if method in (ContraceptiveMethod.CONDOM, ContraceptiveMethod.IUD_COPPER):
            return 0.95
        if method in (ContraceptiveMethod.COC, ContraceptiveMethod.POP, ContraceptiveMethod.INJECTABLE, ContraceptiveMethod.IMPLANT, ContraceptiveMethod.IUD_LNG):
            return 0.2
    if profile.preference == "daily":
        return meta["convenience_daily"]
    return meta["convenience_laa"]


def _cost_access_score(method: ContraceptiveMethod, profile: UserProfile) -> float:
    meta = METHOD_METADATA[method]
    score = meta["cost_score"]
    if not profile.clinic_access and meta["requires_clinic"]:
        score *= 0.4
    return score


def score_method(method: ContraceptiveMethod, profile: UserProfile) -> ScoredMethod:
    meta = METHOD_METADATA[method]
    breakdown = {
        "effectiveness": meta["effectiveness"],
        "convenience": _convenience_score(method, profile),
        "cost_access": _cost_access_score(method, profile),
        "reversibility": meta["reversibility"],
        "side_effects": meta["side_effect_score"],
    }
    total = sum(breakdown[dim] * WEIGHTS[dim] for dim in WEIGHTS)
    return ScoredMethod(
        method=method.value,
        label=METHOD_LABELS[method],
        score=round(total, 4),
        breakdown={k: round(v, 3) for k, v in breakdown.items()},
    )


def rank_methods(profile: UserProfile, safety: SafetyScreenResult, top_n: int = 5) -> list[ScoredMethod]:
    eligible = [ContraceptiveMethod(m) for m in safety.eligible]
    scored = [score_method(m, profile) for m in eligible]
    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[:top_n]


def score_methods(user_input: dict, eliminations: list[dict]) -> list[str]:
    """Score methods function for compatibility with the reproducibility package."""
    eliminated_names = {e['method'] for e in eliminations}

    # Base scores
    scores = {
        "hormonal_implant": 0.8,
        "copper_iud": 0.75,
        "POP": 0.7,
        "DMPA": 0.65,
        "condoms": 0.6,
        "COC": 0.55,
        "combined_patch": 0.5,
        "combined_ring": 0.45
    }

    # Adjustments based on pregnancy goal
    goal = user_input.get("pregnancy_goal", "")
    if goal == "avoid_long_term":
        scores["hormonal_implant"] += 0.2
        scores["copper_iud"] += 0.15
    elif goal == "spacing_1_3_years":
        scores["POP"] += 0.20
        scores["copper_iud"] += 0.11
        scores["DMPA"] += 0.17
        scores["hormonal_implant"] -= 0.10

    # Adjustments based on access
    access = user_input.get("access", "")
    if access == "pharmacy_only":
        # Penalize clinic-based methods
        scores["hormonal_implant"] -= 0.6
        scores["copper_iud"] -= 0.4
        scores["DMPA"] -= 0.4

    # Filter out eliminated
    available = [m for m in scores if m not in eliminated_names]
    # Sort by score descending
    available.sort(key=lambda m: scores[m], reverse=True)
    return available

