import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set) => ({
      language: "en",
      setLanguage: (language) => set({ language }),
      prefillChat: null,
      setPrefillChat: (prefillChat) => set({ prefillChat }),
      selectedMethods: [],
      setSelectedMethods: (selectedMethods) => set({ selectedMethods }),
    }),
    { name: "contrabot-web-app" }
  )
);
