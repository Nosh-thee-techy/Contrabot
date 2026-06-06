import { create } from "zustand";

export const useStore = create((set) => ({
  doctorState: {
    chosen: "amara",
    isTalking: false,
    currentAnimation: "Idle",
    chatState: 0,
  },
  setDoctor: (name) =>
    set((state) => ({
      doctorState: { ...state.doctorState, chosen: name },
    })),
  setTalking: (bool) =>
    set((state) => ({
      doctorState: { ...state.doctorState, isTalking: bool },
    })),
  setChatState: (n) =>
    set((state) => ({
      doctorState: { ...state.doctorState, chatState: n },
    })),
}));
