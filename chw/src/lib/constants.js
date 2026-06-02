export const DISTRICTS = [
  "Nairobi", "Kisumu", "Mombasa", "Kampala", "Gulu", "Jinja", "Mbarara", "Nakawa", "Kibera", "Mathare",
];

export const AGE_GROUPS = ["Under 18", "18–24", "25–34", "35–44", "45+"];
export const HEALTH_OPTS = [
  { id: "high_blood_pressure", label: "High blood pressure" },
  { id: "migraines_aura", label: "Migraines with aura" },
  { id: "blood_clots", label: "History of DVT/blood clots" },
  { id: "diabetes", label: "Diabetes with complications" },
  { id: "liver_disease", label: "Liver disease" },
  { id: "breast_cancer", label: "Breast cancer history" },
];

export const RED_FLAGS = new Set(["high_blood_pressure", "migraines_aura", "blood_clots", "diabetes", "liver_disease", "breast_cancer"]);

export const METHODS_LIST = [
  "coc", "pop", "injectable", "implant", "iud_copper", "iud_lng", "condom", "emergency", "lam", "sterilization",
];

export const SEVERITY_STYLES = {
  escalate: "bg-accent/15 text-accent border-accent/30",
  inform: "bg-amber-100 text-amber-800 border-amber-200",
  reassure: "bg-gray-100 text-muted border-line",
};

export function toApiPayload(form) {
  const ageMap = { "Under 18": "under_18", "18–24": "18-24", "25–34": "25-34", "35–44": "35-44", "45+": "45+" };
  const prefMap = { forget: "set_forget", daily: "daily_control", non_hormonal: "non_hormonal", unsure: "unsure" };
  const accessMap = { clinic: "clinic", pharmacy: "pharmacy", chw: "chw" };
  return {
    age_group: ageMap[form.age_group],
    breastfeeding: form.breastfeeding === "yes",
    parity: form.parity === "yes",
    health_flags: form.health_flags,
    preference: prefMap[form.preference],
    access: accessMap[form.access],
    hormonal_sensitivity: form.sensitivity,
    pregnancy_goal: form.pregnancy_goal,
    district: form.district,
    language: "english",
  };
}
