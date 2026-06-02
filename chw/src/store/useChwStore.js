import { create } from "zustand";
import { persist } from "zustand/middleware";

const loadSessions = () => {
  try {
    return JSON.parse(localStorage.getItem("chw_sessions") || "[]");
  } catch {
    return [];
  }
};

const loadOutcomes = () => {
  try {
    return JSON.parse(localStorage.getItem("chw_outcomes") || "[]");
  } catch {
    return [];
  }
};

export const useChwStore = create(
  persist(
    (set, get) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),

      sessions: loadSessions(),
      outcomes: loadOutcomes(),

      addSession: (session) => {
        const sessions = [{ ...session, id: Date.now(), at: new Date().toISOString() }, ...get().sessions].slice(0, 100);
        localStorage.setItem("chw_sessions", JSON.stringify(sessions));
        set({ sessions });
      },

      addOutcome: (outcome) => {
        const outcomes = [{ ...outcome, id: Date.now(), at: new Date().toISOString() }, ...get().outcomes];
        localStorage.setItem("chw_outcomes", JSON.stringify(outcomes));
        set({ outcomes });
      },

      refresh: () => set({ sessions: loadSessions(), outcomes: loadOutcomes() }),
    }),
    { name: "chw_profile", partialize: (s) => ({ profile: s.profile }) }
  )
);

export function getStats(sessions) {
  const today = new Date().toDateString();
  const todayCount = sessions.filter((s) => new Date(s.at).toDateString() === today).length;
  const methods = {};
  sessions.forEach((s) => {
    if (s.top_method) methods[s.top_method] = (methods[s.top_method] || 0) + 1;
  });
  const top = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
  return {
    today: todayCount,
    total: sessions.length,
    topMethod: top ? top[0] : "—",
    avgMin: sessions.length ? "8 min" : "—",
  };
}
