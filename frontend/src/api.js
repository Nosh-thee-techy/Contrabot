const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function postRecommend(profile) {
  const res = await fetch(`${API}/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  return res.json();
}

export async function postChat(message, sessionId) {
  const res = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  return res.json();
}

export async function getFacilities(district) {
  const res = await fetch(`${API}/facilities?district=${encodeURIComponent(district)}`);
  return res.json();
}

export async function postOutcome(data) {
  const res = await fetch(`${API}/outcomes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch(`${API}/analytics/outcomes`);
  return res.json();
}

export async function getMethodsCompare() {
  const res = await fetch(`${API}/methods/compare`);
  return res.json();
}
