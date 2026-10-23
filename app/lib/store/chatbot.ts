"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/app/lib/constants";
import { ChatbotChatMessage, ChatbotNodeData } from "@/app/lib/types/chatbot";

const MAX_PERSISTED_MESSAGES = 100;

interface ChatbotState {
  savedFlow: ChatbotNodeData | null;
  chatbotRef: string | null;
  messagesSessionId: string | null;
  messages: ChatbotChatMessage[];
  lastEventSeq: number;
  hasHydrated: boolean;
}

interface ChatbotActions {
  setSavedFlow: (flow: ChatbotNodeData) => void;
  setChatbotRef: (ref: string) => void;
  bindSession: (sessionId: string) => void;
  appendMessage: (message: ChatbotChatMessage) => void;
  removeMessage: (id: string) => void;
  setLastEventSeq: (seq: number) => void;
  setHasHydrated: (value: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ChatbotState = {
  savedFlow: null,
  chatbotRef: null,
  messagesSessionId: null,
  messages: [],
  lastEventSeq: 0,
  hasHydrated: false,
};

export const useChatbotStore = create<ChatbotState & ChatbotActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setSavedFlow: (flow) => set({ savedFlow: flow }),

      setChatbotRef: (ref) => set({ chatbotRef: ref }),

      bindSession: (sessionId) =>
        set((state) =>
          state.messagesSessionId === sessionId
            ? state
            : { messagesSessionId: sessionId, messages: [], lastEventSeq: 0 },
        ),

      appendMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message].slice(-MAX_PERSISTED_MESSAGES),
        })),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),

      setLastEventSeq: (seq) => set({ lastEventSeq: seq }),

      setHasHydrated: (value) => set({ hasHydrated: value }),

      reset: () => set({ ...INITIAL_STATE, hasHydrated: true }),
    }),
    {
      name: STORAGE_KEYS.CHATBOT_STATE,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        savedFlow: state.savedFlow,
        chatbotRef: state.chatbotRef,
        messagesSessionId: state.messagesSessionId,
        messages: state.messages,
        lastEventSeq: state.lastEventSeq,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
