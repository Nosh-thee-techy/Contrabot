"""Full method catalog for API and frontend consumption."""

from engine.models import ContraceptiveMethod, METHOD_LABELS, METHOD_METADATA

SIDE_EFFECTS = {
    "coc": [
        {"name": "Nausea", "severity": "low", "quadrant": "reassure", "timeline": "First 1-3 months"},
        {"name": "Breakthrough bleeding", "severity": "moderate", "quadrant": "inform", "timeline": "First 3 months"},
        {"name": "Chest pain or severe headache", "severity": "high", "quadrant": "escalate", "timeline": "Seek care immediately"},
    ],
    "pop": [
        {"name": "Irregular bleeding", "severity": "moderate", "quadrant": "inform", "timeline": "First 3 months"},
        {"name": "Mild headache", "severity": "low", "quadrant": "reassure", "timeline": "Usually settles"},
    ],
    "injectable": [
        {"name": "Weight change", "severity": "moderate", "quadrant": "inform", "timeline": "May occur over time"},
        {"name": "Amenorrhea (no periods)", "severity": "low", "quadrant": "reassure", "timeline": "Common, not harmful"},
        {"name": "Delayed return to fertility", "severity": "moderate", "quadrant": "inform", "timeline": "After stopping"},
    ],
    "implant": [
        {"name": "Irregular bleeding", "severity": "moderate", "quadrant": "inform", "timeline": "First 3-6 months"},
        {"name": "Mood changes", "severity": "moderate", "quadrant": "inform", "timeline": "First few months"},
        {"name": "Infection at insertion site", "severity": "high", "quadrant": "escalate", "timeline": "Seek care if red/swollen"},
    ],
    "iud_copper": [
        {"name": "Heavier periods", "severity": "moderate", "quadrant": "inform", "timeline": "First 3-6 months"},
        {"name": "Cramping", "severity": "moderate", "quadrant": "inform", "timeline": "First weeks"},
    ],
    "iud_lng": [
        {"name": "Irregular bleeding", "severity": "moderate", "quadrant": "inform", "timeline": "First 3-6 months"},
        {"name": "Acne", "severity": "low", "quadrant": "reassure", "timeline": "May improve over time"},
    ],
    "condom": [
        {"name": "Latex allergy", "severity": "high", "quadrant": "escalate", "timeline": "Use non-latex if allergic"},
    ],
    "emergency": [
        {"name": "Nausea", "severity": "moderate", "quadrant": "inform", "timeline": "24-48 hours"},
    ],
    "lam": [
        {"name": "Requires strict breastfeeding pattern", "severity": "moderate", "quadrant": "inform", "timeline": "While breastfeeding"},
    ],
    "sterilization": [
        {"name": "Permanent — not reversible", "severity": "high", "quadrant": "escalate", "timeline": "Consider carefully"},
    ],
}

METHOD_DESCRIPTIONS = {
    "coc": "A daily pill with two hormones that prevents pregnancy when taken consistently.",
    "pop": "A daily pill with one hormone, often suitable while breastfeeding.",
    "injectable": "An injection every 3 months — you don't need to remember daily pills.",
    "implant": "A small rod placed in your arm at a clinic — works for 3-5 years.",
    "iud_copper": "A copper device placed in the uterus at a clinic — no hormones, lasts years.",
    "iud_lng": "A hormonal IUD placed at a clinic — very effective, lasts 3-6 years.",
    "condom": "A barrier used each time you have sex — also protects against STIs.",
    "emergency": "Pills taken after unprotected sex — not for regular use.",
    "lam": "Breastfeeding pattern can prevent pregnancy for up to 6 months postpartum.",
    "sterilization": "A permanent procedure — only for women certain they want no more children.",
}

CHW_SCRIPTS = {
    "implant": "You can tell her: This small rod goes in your upper arm at the clinic. Once it's in, you don't need to think about contraception for 3 years. Some women notice irregular bleeding in the first few months — this is normal and usually settles.",
    "injectable": "You can tell her: She gets one injection every 3 months at the clinic. It's private and she doesn't need to remember a daily pill. Irregular bleeding can happen at first.",
    "pop": "You can tell her: She takes one pill at the same time each day. It's safe while breastfeeding. If she misses pills, protection may be lower.",
    "iud_copper": "You can tell her: A trained provider places a small device in the uterus. No hormones. Periods may be heavier at first.",
    "condom": "You can tell her: She can get condoms at a pharmacy without a clinic visit. They also protect against infections.",
}

EFFECTIVENESS_TYPICAL = {
    "coc": 0.91,
    "pop": 0.91,
    "injectable": 0.94,
    "implant": 0.99,
    "iud_copper": 0.99,
    "iud_lng": 0.99,
    "condom": 0.85,
    "emergency": 0.75,
    "lam": 0.98,
    "sterilization": 0.99,
}

EFFECTIVENESS_PERFECT = {
    "coc": 0.99,
    "pop": 0.99,
    "injectable": 0.99,
    "implant": 0.99,
    "iud_copper": 0.99,
    "iud_lng": 0.99,
    "condom": 0.98,
    "emergency": 0.89,
    "lam": 0.99,
    "sterilization": 0.99,
}

HORMONAL_TYPE = {
    "coc": "Combined hormonal",
    "pop": "Progestogen-only",
    "injectable": "Progestogen-only",
    "implant": "Progestogen-only",
    "iud_copper": "Non-hormonal",
    "iud_lng": "Progestogen-only",
    "condom": "Non-hormonal",
    "emergency": "Hormonal",
    "lam": "Non-hormonal",
    "sterilization": "Non-hormonal",
}

BREASTFEEDING_OK = {"coc": False, "pop": True, "injectable": True, "implant": True, "iud_copper": True, "iud_lng": True, "condom": True, "emergency": True, "lam": True, "sterilization": True}

ACCESS_LABEL = {
    True: "Clinic",
    False: "Pharmacy",
}


def build_method_payload(method_id: str, mec_category: int = 1) -> dict:
    method = ContraceptiveMethod(method_id)
    meta = METHOD_METADATA[method]
    requires_clinic = meta["requires_clinic"]
    return {
        "method": method_id,
        "name": METHOD_LABELS[method],
        "description": METHOD_DESCRIPTIONS.get(method_id, METHOD_LABELS[method]),
        "mec_category": mec_category,
        "effectiveness_typical": EFFECTIVENESS_TYPICAL.get(method_id, meta["effectiveness"]),
        "effectiveness_perfect": EFFECTIVENESS_PERFECT.get(method_id, meta["effectiveness"]),
        "duration": meta["duration"],
        "reversibility": "High" if meta["reversibility"] > 0.8 else "Moderate" if meta["reversibility"] > 0.5 else "Low",
        "cost_band": meta["cost"],
        "access_required": "Clinic" if requires_clinic else "Pharmacy",
        "hormonal_type": HORMONAL_TYPE.get(method_id, "Unknown"),
        "breastfeeding_ok": BREASTFEEDING_OK.get(method_id, True),
        "side_effects": SIDE_EFFECTS.get(method_id, []),
        "chw_script": CHW_SCRIPTS.get(method_id, "Explain benefits, side effects, and that clinic confirmation is needed."),
    }


def all_methods_list() -> list[dict]:
    return [build_method_payload(m.value) for m in ContraceptiveMethod]
