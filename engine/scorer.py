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
