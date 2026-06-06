import pytest

from engine.models import UserProfile
from engine.safety_screen import screen_methods


def test_breastfeeding_eliminates_coc():
    profile = UserProfile(age=28, breastfeeding=True, health_risk=False, channel="web")
    result = screen_methods(profile)
    assert "coc" in result.eliminated
    assert "pop" in result.eligible


def test_health_risk_eliminates_combined_hormonal():
    profile = UserProfile(age=35, health_risk=True, channel="web")
    result = screen_methods(profile)
    assert "coc" in result.eliminated
    assert result.mec_categories["coc"] == 4


def test_adolescent_no_sterilization():
    profile = UserProfile(age=17, channel="web")
    result = screen_methods(profile)
    assert "sterilization" in result.eliminated


def test_no_clinic_access_penalizes_clinical_methods():
    profile = UserProfile(age=25, clinic_access=False, channel="web")
    result = screen_methods(profile)
    assert "implant" in result.eliminated
    assert "condom" in result.eligible


def test_not_breastfeeding_eliminates_lam():
    profile = UserProfile(age=25, breastfeeding=False, channel="web")
    result = screen_methods(profile)
    assert "lam" in result.eliminated


def test_male_eliminates_female_contraceptives():
    profile = UserProfile(age=25, gender="male", channel="web")
    result = screen_methods(profile)
    assert "coc" in result.eliminated
    assert "pop" in result.eliminated
    assert "implant" in result.eliminated
    assert "condom" in result.eligible
