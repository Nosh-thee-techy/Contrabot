import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChwStore } from "@/store/useChwStore";

const COLORS = ["#0E7A80", "#5C3C7A", "#E07B39", "#2E7D32", "#6B7280"];

export default function OutcomesPage() {
  const { outcomes, sessions } = useChwStore();

  const stats = useMemo(() => {
    const total = outcomes.length;
    const accepted = outcomes.filter((o) => o.accepted).length;
    const methods = {};
    outcomes.forEach((o) => {
      methods[o.recommended_method] = (methods[o.recommended_method] || 0) + 1;
    });
    const top = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
    const followups = {};
    outcomes.forEach((o) => {
      followups[o.followup || "yes"] = (followups[o.followup || "yes"] || 0) + 1;
    });
    const topFu = Object.entries(followups).sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      rate: total ? Math.round((accepted / total) * 100) : 0,
      topMethod: top ? top[0] : "—",
      topFollowup: topFu ? topFu[0] : "—",
    };
  }, [outcomes]);

  const byDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      const d = new Date(s.at).toLocaleDateString();
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .slice(-14);
  }, [sessions]);

  const methodPie = useMemo(() => {
    const m = {};
    outcomes.forEach((o) => {
      m[o.recommended_method || "unknown"] = (m[o.recommended_method || "unknown"] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [outcomes]);

  const stacked = useMemo(() => {
    const m = {};
    outcomes.forEach((o) => {
      const key = o.recommended_method || "unknown";
      if (!m[key]) m[key] = { method: key, accepted: 0, declined: 0, undecided: 0 };
      if (o.accepted) m[key].accepted++;
      else if (o.accepted === false) m[key].declined++;
      else m[key].undecided++;
    });
    return Object.values(m);
  }, [outcomes]);

  const exportCsv = () => {
    const headers = ["date", "district", "recommended_method", "accepted", "chosen_method", "followup", "notes"];
    const rows = outcomes.map((o) =>
      [o.at, o.district, o.recommended_method, o.accepted, o.chosen_method, o.followup, `"${(o.notes || "").replace(/"/g, '""')}"`].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contrabot-outcomes.csv";
    a.click();
  };

  return (
    <>
      <Helmet>
        <title>Outcomes — ContraBot CHW</title>
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Dashboard
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Outcomes analytics</h1>
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total logged", value: stats.total },
            { label: "Acceptance rate", value: `${stats.rate}%` },
            { label: "Top method", value: stats.topMethod },
            { label: "Common follow-up", value: stats.topFollowup },
          ].map((s) => (
            <Card key={s.label} className="p-6 text-center">
              <p className="text-2xl font-semibold text-primary">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Sessions over time</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byDate}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0E7A80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-semibold">Method distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={methodPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {methodPie.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card className="mt-8 p-6">
          <h3 className="mb-4 font-semibold">Outcomes by method</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stacked}>
                <XAxis dataKey="method" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="accepted" stackId="a" fill="#2E7D32" />
                <Bar dataKey="undecided" stackId="a" fill="#E07B39" />
                <Bar dataKey="declined" stackId="a" fill="#5C3C7A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="mt-8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-page">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">District</th>
                <th className="p-3 text-left">Recommended</th>
                <th className="p-3 text-left">Accepted</th>
                <th className="p-3 text-left">Follow-up</th>
                <th className="p-3 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.slice(0, 50).map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="p-3">{new Date(o.at).toLocaleString()}</td>
                  <td className="p-3">{o.district}</td>
                  <td className="p-3">{o.recommended_method}</td>
                  <td className="p-3">
                    <Badge variant={o.accepted ? "success" : "accent"}>{o.accepted ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="p-3">{o.followup}</td>
                  <td className="p-3 max-w-[200px] truncate">{o.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
