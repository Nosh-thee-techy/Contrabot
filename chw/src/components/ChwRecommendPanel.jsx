import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SEVERITY_STYLES } from "@/lib/constants";

function MethodCard({ method }) {
  const [scriptOpen, setScriptOpen] = useState(false);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold">{method.name}</h4>
        <Badge variant="secondary">Cat {method.mec_category}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{method.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(method.side_effects || []).map((fx) => (
          <span key={fx.name} className={`rounded-lg border px-2 py-1 text-xs ${SEVERITY_STYLES[fx.quadrant]}`}>
            {fx.name}
          </span>
        ))}
      </div>
      <Badge className="mt-2" variant="muted">
        {method.access_required}
      </Badge>
      <button type="button" onClick={() => setScriptOpen(!scriptOpen)} className="mt-3 flex items-center gap-1 text-sm font-medium text-primary">
        Script for CHW {scriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {scriptOpen && <p className="mt-2 rounded-xl bg-page p-3 text-sm italic">{method.chw_script}</p>}
    </Card>
  );
}

export function ChwRecommendPanel({ loading, result, onFindFacility }) {
  if (loading) {
    return (
      <Card className="p-6">
        <p className="font-medium text-ink">Checking WHO MEC guidelines...</p>
        <Progress value={66} className="mt-4" />
      </Card>
    );
  }
  if (!result) {
    return (
      <Card className="flex min-h-[320px] items-center justify-center p-6 text-center text-muted">
        Fill in the form to generate a recommendation.
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {result.recommendations?.map((m) => (
        <MethodCard key={m.method} method={m} />
      ))}
      <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm">
        Remind client to confirm with a clinician before starting any method.
      </div>
      <Button onClick={onFindFacility}>Find nearest facility</Button>
    </div>
  );
}
