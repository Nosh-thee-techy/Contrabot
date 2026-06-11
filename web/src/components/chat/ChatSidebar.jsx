import { Check, User, Heart, ShieldAlert, Sliders, MapPin, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { key: "age_group", label: "Age Group", Icon: User },
  { key: "breastfeeding", label: "Breastfeeding", Icon: Heart },
  { key: "health_flags", label: "Health Issues", Icon: ShieldAlert },
  { key: "preference", label: "Contraceptive Preference", Icon: Sliders },
  { key: "access", label: "Access Channels", Icon: MapPin },
];

function formatVal(key, profile) {
  const v = profile[key];
  if (v === null || v === undefined) return null;
  if (key === "health_flags") return v.length ? v.join(", ") : "None";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function ChatSidebar({ flowState, profile, recommendations, loading, loadingStep }) {
  // -------------------------------------------------------------
  // Case A: Loading / Guideline Checking (flowState === 6)
  // -------------------------------------------------------------
  if (flowState === 6) {
    const totalSteps = 3;
    const progressPercent = Math.min(100, Math.round(((loadingStep + 1) / totalSteps) * 100));
    
    // SVG circular progress math (radius = 45, circ = 282.7)
    const radius = 45;
    const strokeDasharray = 2 * Math.PI * radius;
    const strokeDashoffset = strokeDasharray - (progressPercent / 100) * strokeDasharray;

    const stepNames = ["Safety screening", "Scoring methods", "Personalizing results"];

    return (
      <div className="space-y-6">
        <div className="bg-[#0E7A80]/5 border border-[#0E7A80]/15 rounded-2xl p-6 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-xl">
          <h3 className="text-sm font-semibold text-[#7A9BA8] uppercase tracking-wider mb-6">Analyzing Profile</h3>
          
          {/* Animated circular progress ring */}
          <div className="relative w-36 h-36 flex items-center justify-center mb-6">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Outer Ring Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="rgba(14, 122, 128, 0.1)"
                strokeWidth="6"
              />
              {/* Progress Bar Track */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="#0E7A80"
                strokeWidth="6"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{progressPercent}%</span>
              <span className="text-[10px] text-[#7A9BA8] font-medium uppercase mt-0.5">
                {loadingStep === 0 ? "Safety" : loadingStep === 1 ? "Scoring" : "Optimizing"}
              </span>
            </div>
          </div>

          {/* Checklist below the ring */}
          <div className="w-full space-y-3.5 mt-2">
            {stepNames.map((s, i) => {
              const done = i < loadingStep;
              const active = i === loadingStep;
              return (
                <div
                  key={s}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 border ${
                    active 
                      ? "bg-[#0E7A80]/10 border-[#0E7A80]/30 text-white font-medium" 
                      : done 
                      ? "bg-transparent border-transparent text-[#7A9BA8]" 
                      : "bg-transparent border-transparent text-[#7A9BA8]/40"
                  }`}
                >
                  <span className="text-xs">{s}</span>
                  {done ? (
                    <span className="h-4 w-4 bg-[#2E7D32]/20 border border-[#2E7D32]/40 text-[#2E7D32] rounded-full flex items-center justify-center text-[10px] font-bold">
                      ✓
                    </span>
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
                  ) : (
                    <span className="h-3.5 w-3.5 border border-teal-950/40 rounded-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Case B: Recommendations (flowState >= 7)
  // -------------------------------------------------------------
  if (flowState >= 7 && recommendations?.recommendations?.length >= 2) {
    const [a, b] = recommendations.recommendations;
    return (
      <div className="space-y-4">
        <div className="bg-[#0E7A80]/8 border border-[#0E7A80]/20 rounded-2xl p-5 backdrop-blur-xl shadow-2xl">
          <h3 className="text-sm font-semibold text-[#7A9BA8] border-b border-[#0E7A80]/15 pb-2.5 mb-4 uppercase tracking-wider">
            Method Quick Facts
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Method A Column */}
            <div className="bg-[#111F2E]/60 border border-[#0E7A80]/15 rounded-xl p-3.5 space-y-3 text-center">
              <h4 className="text-sm font-bold text-teal-400 leading-tight min-h-[36px] flex items-center justify-center">
                {a.name}
              </h4>
              <div className="inline-block bg-[#2E7D32]/15 border border-[#2E7D32]/35 text-[#2E7D32] text-xs font-bold px-2 py-0.5 rounded-full">
                {Math.round(a.effectiveness_typical * 100)}% Effective
              </div>
              <div className="text-[11px] font-semibold bg-[#0E7A80]/12 text-[#4DD6DC] px-2 py-0.5 rounded-md border border-[#0E7A80]/20 inline-block">
                {a.duration}
              </div>
              <div className="text-[10px] text-[#7A9BA8] font-medium border-t border-[#0E7A80]/10 pt-2 block">
                {a.hormonal_type}
              </div>
            </div>

            {/* Method B Column */}
            <div className="bg-[#111F2E]/60 border border-[#0E7A80]/15 rounded-xl p-3.5 space-y-3 text-center">
              <h4 className="text-sm font-bold text-teal-400 leading-tight min-h-[36px] flex items-center justify-center">
                {b.name}
              </h4>
              <div className="inline-block bg-[#2E7D32]/15 border border-[#2E7D32]/35 text-[#2E7D32] text-xs font-bold px-2 py-0.5 rounded-full">
                {Math.round(b.effectiveness_typical * 100)}% Effective
              </div>
              <div className="text-[11px] font-semibold bg-[#0E7A80]/12 text-[#4DD6DC] px-2 py-0.5 rounded-md border border-[#0E7A80]/20 inline-block">
                {b.duration}
              </div>
              <div className="text-[10px] text-[#7A9BA8] font-medium border-t border-[#0E7A80]/10 pt-2 block">
                {b.hormonal_type}
              </div>
            </div>
          </div>
        </div>

        <Link to="/compare" className="inline-block text-xs font-semibold text-[#4DD6DC] hover:text-white transition-colors hover:underline pt-2 pl-1">
          Compare all options side-by-side →
        </Link>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Case C: Profile Intake Stage
  // -------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="bg-[#0E7A80]/8 border border-[#0E7A80]/20 rounded-2xl p-5 backdrop-blur-xl shadow-2xl space-y-4">
        <h3 className="text-sm font-semibold text-[#7A9BA8] border-b border-[#0E7A80]/15 pb-2.5 uppercase tracking-wider">
          Profile Assessment
        </h3>
        
        <div className="space-y-3">
          {STEPS.map(({ key, label, Icon }) => {
            const val = formatVal(key, profile);
            const done = val !== null;
            return (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border ${
                  done 
                    ? "bg-[#111F2E]/60 border-[#0E7A80]/20 animate-slide-down" 
                    : "bg-transparent border-transparent opacity-40"
                }`}
              >
                <div className={`p-2 rounded-lg ${done ? "bg-[#0E7A80]/15 text-[#4DD6DC]" : "bg-transparent text-gray-500"}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#7A9BA8] font-medium leading-none mb-1">{label}</p>
                  <p className="text-xs font-bold text-white truncate">
                    {done ? val : "Pending..."}
                  </p>
                </div>
                {done && (
                  <div className="h-5 w-5 bg-[#0E7A80]/20 rounded-full flex items-center justify-center shrink-0 border border-[#0E7A80]/30">
                    <Check className="h-3 w-3 text-[#4DD6DC] stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#0E7A80]/5 border border-[#0E7A80]/12 rounded-xl p-4 text-[11px] text-[#7A9BA8] leading-relaxed">
        🔐 Your responses are confidential and remain private to this session only.
      </div>
    </div>
  );
}
