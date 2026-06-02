import { useEffect, useState } from "react";
import { getAnalytics, postOutcome, postRecommend } from "../api";

const defaultProfile = {
  age: 25,
  breastfeeding: false,
  health_risk: false,
  preference: "daily",
  clinic_access: true,
  parity: false,
  language: "english",
  district: "Nairobi",
  channel: "chw",
};

export default function ChwPage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [result, setResult] = useState(null);
  const [outcome, setOutcome] = useState({ accepted: true, chosen_method: "", notes: "" });
  const [analytics, setAnalytics] = useState({ by_method: {}, by_district: {} });

  useEffect(() => {
    getAnalytics().then(setAnalytics);
  }, []);

  async function submitProfile(e) {
    e.preventDefault();
    const data = await postRecommend(profile);
    setResult(data);
  }

  async function logOutcome(e) {
    e.preventDefault();
    if (!result) return;
    await postOutcome({
      district: profile.district,
      recommended_method: result.top_method,
      accepted: outcome.accepted,
      chosen_method: outcome.chosen_method || result.top_method,
      notes: outcome.notes,
    });
    setAnalytics(await getAnalytics());
  }

  return (
    <div className="page chw-page">
      <h1>CHW Dashboard</h1>
      <form className="card" onSubmit={submitProfile}>
        <h2>Client Profile</h2>
        <label>Age <input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: +e.target.value })} /></label>
        <label>District <input value={profile.district} onChange={(e) => setProfile({ ...profile, district: e.target.value })} /></label>
        <label><input type="checkbox" checked={profile.breastfeeding} onChange={(e) => setProfile({ ...profile, breastfeeding: e.target.checked })} /> Breastfeeding (&lt;6mo)</label>
        <label><input type="checkbox" checked={profile.health_risk} onChange={(e) => setProfile({ ...profile, health_risk: e.target.checked })} /> Health risk (HTN/migraine/clots)</label>
        <label><input type="checkbox" checked={profile.clinic_access} onChange={(e) => setProfile({ ...profile, clinic_access: e.target.checked })} /> Clinic access</label>
        <label>Preference
          <select value={profile.preference} onChange={(e) => setProfile({ ...profile, preference: e.target.value })}>
            <option value="daily">Daily pill</option>
            <option value="long_acting">Set-and-forget</option>
          </select>
        </label>
        <button type="submit">Get Recommendation</button>
      </form>

      {result && (
        <div className="card">
          <h2>Recommendation</h2>
          <p>{result.recommendation_text}</p>
          <p><strong>Top method:</strong> {result.top_method}</p>
          <ul>
            {result.ranked_methods?.slice(0, 3).map((m) => (
              <li key={m.method}>{m.label} — score {m.score}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <form className="card" onSubmit={logOutcome}>
          <h2>Log Outcome</h2>
          <label><input type="checkbox" checked={outcome.accepted} onChange={(e) => setOutcome({ ...outcome, accepted: e.target.checked })} /> Client accepted recommendation</label>
          <label>Method chosen <input value={outcome.chosen_method} onChange={(e) => setOutcome({ ...outcome, chosen_method: e.target.value })} placeholder={result.top_method} /></label>
          <label>Notes <textarea value={outcome.notes} onChange={(e) => setOutcome({ ...outcome, notes: e.target.value })} /></label>
          <button type="submit">Save Outcome</button>
        </form>
      )}

      <div className="card">
        <h2>Analytics</h2>
        <h3>By method</h3>
        <ul>{Object.entries(analytics.by_method || {}).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
        <h3>By district</h3>
        <ul>{Object.entries(analytics.by_district || {}).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
    </div>
  );
}
