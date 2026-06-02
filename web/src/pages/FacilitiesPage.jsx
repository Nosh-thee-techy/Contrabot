import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFacilities } from "@/api/client";

export default function FacilitiesPage() {
  const { t } = useTranslation();
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [facilities, setFacilities] = useState(null);

  const search = async (e) => {
    e?.preventDefault();
    if (!district.trim()) {
      setError("Please enter your district or town.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await getFacilities(district.trim());
      setFacilities(data.facilities || []);
    } catch {
      setError("We couldn't search right now. Please try again.");
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Find a clinic — ContraBot</title>
        <meta name="description" content="Find family planning clinics near you." />
      </Helmet>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Logo />
          <Link to="/chat">
            <Button variant="ghost">← Back to chat</Button>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold">{t("facilitiesTitle")}</h1>
        <p className="mt-2 text-muted">{t("facilitiesSub")}</p>

        <form onSubmit={search} className="mt-6 flex gap-2">
          <Input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : t("searchBtn")}
          </Button>
        </form>

        {error && <p className="mt-4 text-sm text-accent">{error}</p>}

        <div className="mt-8 space-y-4">
          {facilities?.length === 0 && (
            <p className="text-center text-muted">{t("emptyFacilities")}</p>
          )}
          {facilities?.map((f) => (
            <Card key={f.name} className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{f.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                    <MapPin className="h-4 w-4" />
                    {f.district}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(f.services || []).map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href={`tel:${f.phone}`} className="text-primary">
                      {f.phone}
                    </a>
                  </p>
                  <p className="text-xs text-muted mt-1">{f.hours || "Hours not listed"}</p>
                </div>
                {f.lat && f.lng && (
                  <Button asChild variant="default">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get directions →
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
