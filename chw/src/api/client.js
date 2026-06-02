import axios from "axios";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = import.meta.env.VITE_API_URL || "";

export const api = axios.create({ baseURL: BASE, timeout: 30000 });

const MOCK = {
  recommendations: [
    {
      method: "implant",
      name: "Contraceptive implant",
      description: "Small rod in the arm — 3-5 years protection.",
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
      ],
      chw_script: "You can tell her: This small rod goes in your upper arm at the clinic. Once it's in, you don't need to think about contraception for 3 years.",
    },
    {
      method: "pop",
      name: "Progestogen-only pill",
      description: "Daily pill — suitable while breastfeeding.",
      mec_category: 1,
      effectiveness_typical: 0.91,
      effectiveness_perfect: 0.99,
      duration: "Daily",
      reversibility: "High",
      cost_band: "Low",
      access_required: "Pharmacy",
      hormonal_type: "Progestogen-only",
      breastfeeding_ok: true,
      side_effects: [{ name: "Irregular bleeding", severity: "moderate", quadrant: "inform", timeline: "First 3 months" }],
      chw_script: "You can tell her: She takes one pill at the same time each day. It's safe while breastfeeding.",
    },
  ],
  safety_eliminations: [],
};

export async function postRecommend(payload) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1000));
    return MOCK;
  }
  const { data } = await api.post("/api/recommend", payload);
  return data;
}

export async function getFacilities(district) {
  if (USE_MOCK) {
    return {
      facilities: [
        { name: "Nairobi West Health Centre", district, services: ["Implant", "IUD"], phone: "+254712345001", hours: "Mon–Fri 8–5", lat: -1.29, lng: 36.82 },
      ],
    };
  }
  const { data } = await api.get("/api/facilities", { params: { district, limit: 3 } });
  return data;
}
