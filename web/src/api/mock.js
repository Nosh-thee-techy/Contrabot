export const MOCK_RECOMMEND = {
  recommendations: [
    {
      method: "implant",
      name: "Contraceptive implant",
      description: "A small rod placed in your arm at a clinic — works for 3-5 years without daily pills.",
      mec_category: 1,
      effectiveness_typical: 0.99,
      effectiveness_perfect: 0.99,
      duration: "3-5 years",
      reversibility: "High",
      cost_band: "Moderate",
      access_required: "Clinic",
      hormonal_type: "Progestogen-only",
      breastfeeding_ok: true,
      side_effects: [
        { name: "Irregular bleeding", severity: "moderate", quadrant: "inform", timeline: "First 3-6 months" },
        { name: "Mood changes", severity: "moderate", quadrant: "inform", timeline: "First few months" },
      ],
    },
    {
      method: "pop",
      name: "Progestogen-only pill",
      description: "A daily pill with one hormone — often suitable while breastfeeding.",
      mec_category: 1,
      effectiveness_typical: 0.91,
      effectiveness_perfect: 0.99,
      duration: "Daily pill",
      reversibility: "High",
      cost_band: "Low",
      access_required: "Pharmacy",
      hormonal_type: "Progestogen-only",
      breastfeeding_ok: true,
      side_effects: [
        { name: "Irregular bleeding", severity: "moderate", quadrant: "inform", timeline: "First 3 months" },
        { name: "Mild headache", severity: "low", quadrant: "reassure", timeline: "Usually settles" },
      ],
    },
  ],
  safety_eliminations: [{ method: "coc", reason: "Combined hormonal methods not recommended while breastfeeding under 6 months." }],
  recommendation_text: "Based on your answers, an implant or progestogen-only pill may suit you well. Please confirm at a clinic.",
};

export const MOCK_METHODS = [
  "coc", "pop", "injectable", "implant", "iud_copper", "iud_lng", "condom", "emergency", "lam", "sterilization",
].map((id, i) => ({
  method: id,
  name: id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  effectiveness_typical: 0.85 + i * 0.01,
  effectiveness_perfect: 0.95,
  duration: "Varies",
  hormonal_type: i % 2 ? "Hormonal" : "Non-hormonal",
  reversibility: "High",
  cost_band: "Low",
  access_required: i % 3 ? "Clinic" : "Pharmacy",
  breastfeeding_ok: i !== 0,
  side_effects: [
    { name: "Irregular bleeding", severity: "moderate", quadrant: "inform", timeline: "First months" },
  ],
}));

export const MOCK_FACILITIES = {
  facilities: [
    { name: "Nairobi West Health Centre", district: "Nairobi", lat: -1.2921, lng: 36.8219, services: ["IUD", "Implant", "Injectables"], phone: "+254712345001", hours: "Mon–Fri 8am–5pm" },
    { name: "Kibera Community Dispensary", district: "Nairobi", lat: -1.3132, lng: 36.7896, services: ["CHW", "Injectables"], phone: "+254712345002", hours: "Mon–Sat 8am–4pm" },
  ],
};

export const MOCK_CHAT = {
  reply: "Irregular bleeding on a new method is common in the first 3 months. If bleeding is very heavy or you feel dizzy, visit a clinic. Otherwise, it often settles.",
  quick_replies: ["Thank you", "Find a clinic"],
  state: "side_effects",
  session_id: "mock-session",
};
