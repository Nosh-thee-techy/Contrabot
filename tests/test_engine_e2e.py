import pytest

from engine.models import UserProfile
from engine.pipeline import run_recommendation
from engine.safety_screen import screen_methods
from engine.scorer import rank_methods

TEST_PROFILES = [
    {
        "name": "breastfeeding_mother",
        "profile": UserProfile(age=26, breastfeeding=True, preference="daily", channel="web"),
        "must_eliminate": ["coc"],
    },
    {
        "name": "hypertension",
        "profile": UserProfile(age=40, health_risk=True, channel="web"),
        "must_eliminate": ["coc"],
    },
    {
        "name": "nulliparous_under_18",
        "profile": UserProfile(age=17, parity=False, channel="web"),
        "must_eliminate": ["sterilization"],
    },
    {
        "name": "no_clinic_access",
        "profile": UserProfile(age=22, clinic_access=False, channel="web"),
        "must_eliminate": ["implant", "injectable"],
    },
    {
        "name": "long_acting_preference",
        "profile": UserProfile(age=30, preference="long_acting", channel="web"),
        "must_eliminate": [],
    },
    {
        "name": "high_hormonal_sensitivity",
        "profile": UserProfile(age=24, health_risk=False, preference="daily", channel="web"),
        "must_eliminate": [],
    },
    {
        "name": "breastfeeding_long_acting",
        "profile": UserProfile(age=29, breastfeeding=True, preference="long_acting", channel="web"),
        "must_eliminate": ["coc"],
    },
    {
        "name": "older_smoker_proxy_health",
        "profile": UserProfile(age=38, health_risk=True, breastfeeding=False, channel="web"),
        "must_eliminate": ["coc"],
    },
    {
        "name": "rural_no_access_young",
        "profile": UserProfile(age=19, clinic_access=False, parity=False, channel="web"),
        "must_eliminate": ["sterilization", "implant"],
    },
    {
        "name": "postpartum_not_breastfeeding",
        "profile": UserProfile(age=31, breastfeeding=False, parity=True, preference="long_acting", channel="web"),
        "must_eliminate": [],
    },
]


@pytest.mark.parametrize("case", TEST_PROFILES, ids=[c["name"] for c in TEST_PROFILES])
def test_profile_safety(case):
    safety = screen_methods(case["profile"])
    for method in case["must_eliminate"]:
        assert method in safety.eliminated, f"{case['name']}: expected {method} eliminated"


def test_scorer_returns_ranked_methods():
    profile = UserProfile(age=25, preference="long_acting", channel="web")
    safety = screen_methods(profile)
    ranked = rank_methods(profile, safety)
    assert len(ranked) >= 1
    assert ranked[0].score >= ranked[-1].score


def test_full_engine_fallback_without_llm(monkeypatch):
    def fail_completion(*args, **kwargs):
        raise RuntimeError("no llm")

    monkeypatch.setattr("engine.recommender.chat_completion", fail_completion)
    profile = UserProfile(age=25, channel="web")
    result = run_recommendation(profile)
    assert result.recommendation_text
    assert result.top_method
