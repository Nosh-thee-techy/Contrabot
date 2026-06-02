import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

const STEPS = [
  { key: "age_group", label: "Age" },
  { key: "breastfeeding", label: "Breastfeeding" },
  { key: "health_flags", label: "Health" },
  { key: "preference", label: "Preference" },
  { key: "access", label: "Access" },
];

function formatVal(key, profile) {
  const v = profile[key];
  if (v === null || v === undefined) return null;
  if (key === "health_flags") return v.length ? v.join(", ") : "None";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function ChatSidebar({ flowState, profile, recommendations, loading, loadingStep }) {
  if (flowState === 6) {
    const steps = ["Safety screening ✓", "Scoring methods...", "Personalizing results..."];
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checking WHO guidelines...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={(loadingStep / 3) * 100} />
          <ul className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={s} className={i <= loadingStep ? "text-primary" : "text-muted"}>
                {i < loadingStep ? "✓ " : i === loadingStep ? "… " : "○ "}
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (flowState >= 7 && recommendations?.recommendations?.length >= 2) {
    const [a, b] = recommendations.recommendations;
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Method quick facts</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted">
                  <th className="text-left py-1" />
                  <th className="text-left py-1">{a.name.split(" ")[0]}</th>
                  <th className="text-left py-1">{b.name.split(" ")[0]}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Effectiveness", `${Math.round(a.effectiveness_typical * 100)}%`, `${Math.round(b.effectiveness_typical * 100)}%`],
                  ["Duration", a.duration, b.duration],
                  ["Reversible", a.reversibility, b.reversibility],
                  ["Cost", a.cost_band, b.cost_band],
                ].map(([label, va, vb]) => (
                  <tr key={label} className="border-t border-line">
                    <td className="py-2 font-medium">{label}</td>
                    <td className="py-2">{va}</td>
                    <td className="py-2">{vb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Link to="/compare" className="text-sm font-medium text-secondary hover:underline">
          Want to compare more methods? →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your profile so far</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STEPS.map(({ key, label }) => {
            const val = formatVal(key, profile);
            const done = val !== null;
            return (
              <div key={key} className="flex items-start gap-2 text-sm">
                {done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <Circle className="h-4 w-4 text-line shrink-0" />}
                <div>
                  <p className="font-medium text-ink">{label}</p>
                  {done && <p className="text-muted">{val}</p>}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 text-sm text-ink">
          Your answers are not saved after this session.
        </CardContent>
      </Card>
    </div>
  );
}
