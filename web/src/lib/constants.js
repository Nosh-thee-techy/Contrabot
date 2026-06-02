export const HEALTH_FLAG_MAP = {
  "High blood pressure": "high_blood_pressure",
  "Migraines with aura": "migraines_aura",
  "History of blood clots": "blood_clots",
  Diabetes: "diabetes",
  "Liver disease": "liver_disease",
  "Breast cancer history": "breast_cancer",
};

export const AGE_MAP = {
  "Under 18": "under_18",
  "18–24": "18-24",
  "25–34": "25-34",
  "35–44": "35-44",
  "45+": "45+",
};

export const PREF_MAP = {
  "Set it and forget it": "set_forget",
  "I want daily control": "daily_control",
  "Prefer non-hormonal": "non_hormonal",
  "I'm not sure yet": "unsure",
};

export const ACCESS_MAP = {
  "I can visit a clinic": "clinic",
  "Pharmacy only": "pharmacy",
  "Through a CHW only": "chw",
};

export const SEVERITY_STYLES = {
  escalate: "bg-accent/15 text-accent border-accent/30",
  inform: "bg-amber-100 text-amber-800 border-amber-200",
  reassure: "bg-gray-100 text-muted border-line",
};

export const ALL_METHOD_IDS = [
  "coc", "pop", "injectable", "implant", "iud_copper", "iud_lng", "condom", "emergency", "lam", "sterilization",
];
