import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SEVERITY_STYLES } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";

function MethodCard({ method }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-4">
      <h4 className="font-semibold text-ink">{method.name}</h4>
      <p className="mt-1 text-sm text-muted">{method.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="success">{Math.round(method.effectiveness_typical * 100)}% effective</Badge>
        <Badge>{method.duration}</Badge>
        <Badge variant="secondary">{method.hormonal_type}</Badge>
        <Badge variant="muted">{method.access_required}</Badge>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-3 flex items-center gap-1 text-sm font-medium text-primary"
      >
        What to expect {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {method.side_effects?.slice(0, 2).map((fx) => (
            <li key={fx.name} className={`rounded-lg border px-3 py-2 text-xs ${SEVERITY_STYLES[fx.quadrant] || SEVERITY_STYLES.inform}`}>
              <strong>{fx.name}</strong> — {fx.timeline}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RecommendationCard({ data }) {
  const navigate = useNavigate();
  const setSelectedMethods = useAppStore((s) => s.setSelectedMethods);

  if (!data?.recommendations?.length) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-100 bg-page p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-success" />
        <h3 className="font-semibold text-ink">Your top matches</h3>
        <Badge variant="success">WHO screened</Badge>
      </div>
      {data.recommendations.map((m) => (
        <MethodCard key={m.method} method={m} />
      ))}
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-ink">
        These are suggestions only. Please confirm with your nearest clinic or community health worker before starting any method.
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => navigate("/facilities")}>Find nearest clinic →</Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelectedMethods(data.recommendations.map((r) => r.method));
            navigate(`/compare?methods=${data.recommendations.map((r) => r.method).join(",")}`);
          }}
        >
          Compare all methods →
        </Button>
      </div>
    </div>
  );
}
