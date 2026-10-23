"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/app/lib/constants";
import { ChatbotNodeData } from "@/app/lib/types/chatbot";

interface ChatbotState {
  savedFlow: ChatbotNodeData | null;
  chatbotRef: string | null;
  sessionId: string | null;
  hasHydrated: boolean;
}

interface ChatbotActions {
  setSavedFlow: (flow: ChatbotNodeData) => void;
  setChatbotRef: (ref: string) => void;
  setSessionId: (sessionId: string) => void;
  setHasHydrated: (value: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ChatbotState = {
  savedFlow: null,
  chatbotRef: null,
  sessionId: null,
  hasHydrated: false,
};

type PersistedChatbotState = Pick<
  ChatbotState,
  "savedFlow" | "chatbotRef" | "sessionId"
>;

export const useChatbotStore = create<ChatbotState & ChatbotActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setSavedFlow: (flow) => set({ savedFlow: flow }),

      setChatbotRef: (ref) => set({ chatbotRef: ref }),

      setSessionId: (sessionId) => set({ sessionId }),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      reset: () => set({ ...INITIAL_STATE, hasHydrated: true }),
    }),
    {
      name: STORAGE_KEYS.CHATBOT_STATE,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state): PersistedChatbotState => ({
        savedFlow: state.savedFlow,
        chatbotRef: state.chatbotRef,
        sessionId: state.sessionId,
      }),
      // v1 also stored the transcript; keep only the shared fields.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as Partial<
          PersistedChatbotState & { messagesSessionId: string | null }
        >;
        return {
          savedFlow: old.savedFlow ?? null,
          chatbotRef: old.chatbotRef ?? null,
          sessionId: old.sessionId ?? old.messagesSessionId ?? null,
        };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/**
 * Loads the persisted chatbot state and keeps it in sync across tabs, so a
 * chat tab follows a session created by Save on the canvas tab.
 */
export function useChatbotStoreHydration(): void {
  useEffect(() => {
    useChatbotStore.persist.rehydrate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.CHATBOT_STATE) {
        useChatbotStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
}
