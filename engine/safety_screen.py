"""
Pure-Python WHO MEC-inspired safety screen.
Eliminates methods based on user health flags — no LLM involved.
MEC categories: 1=use, 2=benefits outweigh risks, 3=risks outweigh, 4=do not use.
"""

from engine.models import ContraceptiveMethod, METHOD_LABELS, SafetyScreenResult, UserProfile

ALL_METHODS = list(ContraceptiveMethod)


def _mec_table(profile: UserProfile) -> dict[ContraceptiveMethod, tuple[int, str]]:
    """Return MEC category and reason for each method given profile flags."""
    categories: dict[ContraceptiveMethod, tuple[int, str]] = {}

    for method in ALL_METHODS:
        categories[method] = (1, "No restriction for this profile.")

    if profile.gender == "male":
        for female_method in (
            ContraceptiveMethod.COC,
            ContraceptiveMethod.POP,
            ContraceptiveMethod.INJECTABLE,
            ContraceptiveMethod.IMPLANT,
            ContraceptiveMethod.IUD_COPPER,
            ContraceptiveMethod.IUD_LNG,
            ContraceptiveMethod.LAM,
            ContraceptiveMethod.EMERGENCY,
        ):
            categories[female_method] = (
                4,
                "This method is for females only.",
            )

    if profile.health_risk:
        categories[ContraceptiveMethod.COC] = (
            4,
            "Combined hormonal methods are contraindicated with hypertension, migraine with aura, or clot history.",
        )
        categories[ContraceptiveMethod.IUD_LNG] = (
            3,
            "Hormonal IUD may carry additional risk with cardiovascular conditions — clinic review needed.",
        )

    if profile.breastfeeding:
        categories[ContraceptiveMethod.COC] = (
            3,
            "Combined pills may reduce milk supply before 6 months postpartum (WHO MEC Category 3).",
        )
        categories[ContraceptiveMethod.LAM] = (
            1,
            "LAM is suitable if fully breastfeeding, amenorrheic, and baby under 6 months.",
        )
    else:
        categories[ContraceptiveMethod.LAM] = (
            4,
            "Lactational Amenorrhea Method (LAM) is only possible when actively breastfeeding.",
        )

    if profile.age < 18:
        categories[ContraceptiveMethod.STERILIZATION] = (
            4,
            "Permanent sterilization is not appropriate for adolescents.",
        )
        for hormonal in (
            ContraceptiveMethod.COC,
            ContraceptiveMethod.POP,
            ContraceptiveMethod.INJECTABLE,
            ContraceptiveMethod.IMPLANT,
        ):
            cat, reason = categories[hormonal]
            if cat < 2:
                categories[hormonal] = (2, "Adolescents may use with counseling and follow-up.")

    if not profile.clinic_access:
        for method in (
            ContraceptiveMethod.INJECTABLE,
            ContraceptiveMethod.IMPLANT,
            ContraceptiveMethod.IUD_COPPER,
            ContraceptiveMethod.IUD_LNG,
            ContraceptiveMethod.STERILIZATION,
        ):
            cat, reason = categories[method]
            if cat <= 2:
                categories[method] = (
                    3,
                    "This method requires a trained provider — limited access may be a barrier.",
                )

    if profile.preference == "long_acting":
        categories[ContraceptiveMethod.EMERGENCY] = (
            3,
            "Emergency contraception is not a regular long-acting method.",
        )

    return categories


def screen_methods(profile: UserProfile) -> SafetyScreenResult:
    mec = _mec_table(profile)
    eliminated: list[str] = []
    eligible: list[str] = []
    mec_categories: dict[str, int] = {}
    warnings: list[str] = []

    for method, (category, reason) in mec.items():
        key = method.value
        mec_categories[key] = category
        if category >= 3:
            eliminated.append(key)
            if category == 4:
                warnings.append(f"{METHOD_LABELS[method]}: {reason}")
        else:
            eligible.append(key)

    if profile.health_risk:
        warnings.insert(
            0,
            "Based on your health history, please visit a clinic before starting any hormonal method.",
        )

    return SafetyScreenResult(
        eliminated=eliminated,
        mec_categories=mec_categories,
        warnings=warnings,
        eligible=eligible,
    )
