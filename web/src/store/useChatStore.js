import { create } from "zustand";

const initialProfile = {
  age_group: null,
  breastfeeding: null,
  health_flags: [],
  preference: null,
  access: null,
};

export const useChatStore = create((set, get) => ({
  flowState: 0,
  messages: [],
  profile: { ...initialProfile },
  recommendations: null,
  loading: false,
  loadingStep: 0,
  sessionId: `web-${Date.now()}`,
  sideEffectFlow: null,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, { ...msg, id: `${Date.now()}-${Math.random()}` }] })),

  setFlowState: (flowState) => set({ flowState }),

  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  setRecommendations: (recommendations) => set({ recommendations }),

  setLoading: (loading, loadingStep = 0) => set({ loading, loadingStep }),

  setSideEffectFlow: (sideEffectFlow) => set({ sideEffectFlow }),

  reset: () =>
    set({
      flowState: 0,
      messages: [],
      profile: { ...initialProfile },
      recommendations: null,
      loading: false,
      loadingStep: 0,
      sessionId: `web-${Date.now()}`,
      sideEffectFlow: null,
    }),
}));
