import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getMethods } from "@/api/client";
import { useAppStore } from "@/store/useAppStore";
import { SEVERITY_STYLES, ALL_METHOD_IDS } from "@/lib/constants";

const MAX_SELECT = 4;

function cellColor(row, values) {
  const nums = values.map((v) => (typeof v === "number" ? v : parseFloat(v) || 0));
  const val = typeof row === "number" ? row : parseFloat(row) || 0;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (val === max) return "bg-green-50 text-success";
  if (val === min) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-800";
}

export default function ComparePage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const stored = useAppStore((s) => s.selectedMethods);
  const setStored = useAppStore((s) => s.setSelectedMethods);
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState("");

  useEffect(() => {
    getMethods().then((d) => setMethods(d.methods || []));
    const fromUrl = params.get("methods")?.split(",").filter(Boolean) || [];
    const initial = fromUrl.length ? fromUrl : stored.length ? stored : [];
    setSelected(initial.slice(0, MAX_SELECT));
  }, []);

  useEffect(() => {
    if (selected.length) {
      setParams({ methods: selected.join(",") });
      setStored(selected);
    }
  }, [selected]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      return;
    }
    if (selected.length >= MAX_SELECT) {
      setToast("You can compare up to 4 methods at a time.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    setSelected([...selected, id]);
  };

  const selectedData = methods.filter((m) => selected.includes(m.method));

  const rows = [
    { label: "Effectiveness (typical)", key: (m) => `${Math.round((m.effectiveness_typical || 0) * 100)}%`, num: (m) => m.effectiveness_typical },
    { label: "Effectiveness (perfect)", key: (m) => `${Math.round((m.effectiveness_perfect || m.effectiveness_typical || 0) * 100)}%`, num: (m) => m.effectiveness_perfect || m.effectiveness_typical },
    { label: "Duration", key: (m) => m.duration },
    { label: "Hormonal type", key: (m) => m.hormonal_type },
    { label: "Reversibility", key: (m) => m.reversibility },
    { label: "Cost band", key: (m) => m.cost_band },
    { label: "Access", key: (m) => m.access_required },
    { label: "Breastfeeding OK", key: (m) => (m.breastfeeding_ok ? "Yes" : "No") },
  ];

  const chartData = selectedData.map((m) => ({
    name: m.name?.split(" ")[0] || m.method,
    pct: Math.round((m.effectiveness_typical || 0) * 100),
  }));

  return (
    <>
      <Helmet>
        <title>Compare methods — ContraBot</title>
        <meta name="description" content="Compare contraceptive methods side by side." />
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link to="/chat">
            <Button variant="ghost">← Back to chat</Button>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold">{t("compareTitle")}</h1>
        <p className="mt-2 text-muted">{t("compareSub")}</p>

        {toast && <p className="mt-2 text-sm text-accent">{toast}</p>}

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
          {(methods.length ? methods : ALL_METHOD_IDS.map((id) => ({ method: id, name: id }))).map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => toggle(m.method)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
                selected.includes(m.method) ? "border-primary bg-primary text-white" : "border-line bg-white text-muted"
              }`}
            >
              {m.name || m.method}
            </button>
          ))}
        </div>

        {selected.length >= 2 && (
          <>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="sticky left-0 bg-white p-4 text-left font-medium">Dimension</th>
                    {selectedData.map((m) => (
                      <th key={m.method} className="p-4 text-left font-medium">
                        {m.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const nums = selectedData.map((m) => row.num?.(m)).filter((n) => typeof n === "number");
                    return (
                      <tr key={row.label} className="border-b border-line">
                        <td className="sticky left-0 bg-white p-4 font-medium">{row.label}</td>
                        {selectedData.map((m) => {
                          const val = row.key(m);
                          const cls = nums.length ? cellColor(row.num(m), nums) : "";
                          return (
                            <td key={m.method} className={`p-4 ${cls}`}>
                              {row.label.includes("Breastfeeding") ? (
                                <Badge variant={m.breastfeeding_ok ? "success" : "accent"}>{val}</Badge>
                              ) : (
                                val
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {selectedData.map((m) => (
                <Card key={m.method} className="p-4">
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="mt-2 text-xs font-medium text-muted">Common effects</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(m.side_effects || []).map((fx) => (
                      <span key={fx.name} className={`rounded-full border px-2 py-1 text-xs ${SEVERITY_STYLES[fx.quadrant]}`}>
                        {fx.name}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            <Card className="mt-8 p-6">
              <h3 className="mb-4 font-semibold">Effectiveness (typical use)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                    <Bar dataKey="pct" radius={[0, 8, 8, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#0E7A80" />
                      ))}
                      <LabelList dataKey="pct" position="right" formatter={(v) => `${v}%`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </>
        )}

        {selected.length < 2 && (
          <p className="mt-8 text-center text-muted">Select at least 2 methods to compare.</p>
        )}
      </div>
    </>
  );
}
