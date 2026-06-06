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
  _talkingTimeout: null,

  doctorState: {
    chosen: null,        // 'amara' | 'kofi'
    isTalking: false,
    currentAnimation: "Idle",
    chatState: 0,
  },

  setDoctor: (name) => set((s) => ({ doctorState: { ...s.doctorState, chosen: name } })),
  setTalking: (bool) => set((s) => ({ doctorState: { ...s.doctorState, isTalking: bool } })),
  setChatState: (n) => set((s) => ({ doctorState: { ...s.doctorState, chatState: n } })),

  addMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, { ...msg, id: `${Date.now()}-${Math.random()}` }] }));
    if (msg.role === "bot") {
      get().setTalking(true);
      if (get()._talkingTimeout) clearTimeout(get()._talkingTimeout);
      const timeout = setTimeout(() => {
        get().setTalking(false);
      }, 2500);
      set({ _talkingTimeout: timeout });
    }
  },

  setFlowState: (flowState) => {
    set({ flowState });
    get().setChatState(flowState);
  },

  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

  setRecommendations: (recommendations) => set({ recommendations }),

  setLoading: (loading, loadingStep = 0) => set({ loading, loadingStep }),

  setSideEffectFlow: (sideEffectFlow) => set({ sideEffectFlow }),

  reset: () => {
    if (get()._talkingTimeout) clearTimeout(get()._talkingTimeout);
    set({
      flowState: 0,
      messages: [],
      profile: { ...initialProfile },
      recommendations: null,
      loading: false,
      loadingStep: 0,
      sessionId: `web-${Date.now()}`,
      sideEffectFlow: null,
      doctorState: {
        chosen: null,
        isTalking: false,
        currentAnimation: "Idle",
        chatState: 0,
      },
      _talkingTimeout: null,
    });
  },
}));
