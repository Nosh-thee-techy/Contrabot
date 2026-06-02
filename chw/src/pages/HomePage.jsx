import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { useChwStore, getStats } from "@/store/useChwStore";
import { DISTRICTS } from "@/lib/constants";

export default function HomePage() {
  const { profile, setProfile, sessions, refresh } = useChwStore();
  const [showOnboard, setShowOnboard] = useState(false);
  const [form, setForm] = useState({ name: "", district: "Nairobi", chw_id: "" });

  useEffect(() => {
    refresh();
    if (!profile) setShowOnboard(true);
  }, [profile]);

  const stats = getStats(sessions);

  const saveProfile = () => {
    if (!form.name.trim()) return;
    setProfile(form);
    setShowOnboard(false);
  };

  return (
    <>
      <Helmet>
        <title>CHW Dashboard — ContraBot</title>
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-semibold">CB</div>
            <h1 className="text-xl font-semibold">ContraBot CHW Dashboard</h1>
          </div>
          {profile && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{profile.name} · {profile.district}</Badge>
              <button type="button" className="text-sm text-primary" onClick={() => setShowOnboard(true)}>
                Change details
              </button>
            </div>
          )}
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Sessions today", value: stats.today },
            { label: "Total sessions", value: stats.total },
            { label: "Top recommended", value: stats.topMethod },
            { label: "Avg. session time", value: stats.avgMin },
          ].map((s) => (
            <Card key={s.label} className="p-6 text-center">
              <p className="text-2xl font-semibold text-primary">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link to="/consult">
            <Card className="flex h-32 cursor-pointer items-center justify-center bg-primary p-6 text-center text-white hover:bg-primary/90">
              <span className="text-lg font-semibold">New consultation →</span>
            </Card>
          </Link>
          <Link to="/outcomes">
            <Card className="flex h-32 cursor-pointer items-center justify-center border-2 border-primary bg-white p-6 text-center text-primary hover:bg-page">
              <span className="text-lg font-semibold">View outcomes →</span>
            </Card>
          </Link>
        </div>

        <Card className="mt-8 overflow-hidden">
          <div className="border-b border-line px-6 py-4 font-semibold">Recent sessions</div>
          <table className="w-full text-sm">
            <thead className="bg-page text-muted">
              <tr>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Age</th>
                <th className="p-3 text-left">Top method</th>
                <th className="p-3 text-left">Outcome</th>
                <th className="p-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 10).map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="p-3">{new Date(s.at).toLocaleString()}</td>
                  <td className="p-3">{s.age_group}</td>
                  <td className="p-3">{s.top_method}</td>
                  <td className="p-3">
                    <Badge variant={s.outcome_logged ? "success" : "muted"}>{s.outcome_logged ? "Yes" : "No"}</Badge>
                  </td>
                  <td className="p-3 text-primary">View</td>
                </tr>
              ))}
              {!sessions.length && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted">
                    No sessions yet. Start a new consultation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={showOnboard} onOpenChange={setShowOnboard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Welcome, CHW</DialogTitle>
            <DialogDescription>Tell us a bit about yourself to personalize your dashboard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mary" />
            </div>
            <div>
              <Label>Your district</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                {DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div>
              <Label>CHW ID (optional)</Label>
              <Input value={form.chw_id} onChange={(e) => setForm({ ...form, chw_id: e.target.value })} />
            </div>
            <Button className="w-full" onClick={saveProfile}>
              Start counseling →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
