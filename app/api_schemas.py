from typing import Literal, Optional

from pydantic import BaseModel, Field

AgeGroup = Literal["under_18", "18-24", "25-34", "35-44", "45+"]
PreferenceType = Literal["set_forget", "daily_control", "non_hormonal", "unsure"]
AccessType = Literal["clinic", "pharmacy", "chw"]
HormonalSensitivity = Literal["none", "mild", "high"]
PregnancyGoal = Literal["avoid_long", "spacing_1_3", "spacing_3_plus", "unsure"]


class WebRecommendRequest(BaseModel):
    age_group: AgeGroup
    breastfeeding: bool = False
    health_flags: list[str] = Field(default_factory=list)
    preference: PreferenceType = "unsure"
    access: AccessType = "clinic"
    hormonal_sensitivity: HormonalSensitivity = "none"
    pregnancy_goal: PregnancyGoal = "unsure"
    parity: bool = False
    language: str = "english"
    district: Optional[str] = None


class SideEffectItem(BaseModel):
    name: str
    severity: str
    quadrant: str
    timeline: str


class MethodRecommendation(BaseModel):
    method: str
    name: str
    description: str
    mec_category: int
    effectiveness_typical: float
    effectiveness_perfect: float
    duration: str
    reversibility: str
    cost_band: str
    access_required: str
    hormonal_type: str
    breastfeeding_ok: bool
    side_effects: list[SideEffectItem]
    chw_script: Optional[str] = None


class SafetyElimination(BaseModel):
    method: str
    reason: str


class WebRecommendResponse(BaseModel):
    recommendations: list[MethodRecommendation]
    safety_eliminations: list[SafetyElimination]
    recommendation_text: str


class WebChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    language: str = "english"
    context: Optional[dict] = None


class WebChatResponse(BaseModel):
    reply: str
    quick_replies: list[str] = Field(default_factory=list)
    state: Optional[str] = None
    session_id: Optional[str] = None
