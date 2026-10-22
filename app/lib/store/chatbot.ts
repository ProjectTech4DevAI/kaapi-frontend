"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/app/lib/constants";
import { ChatbotChatMessage, ChatbotNodeData } from "@/app/lib/types/chatbot";

const MAX_PERSISTED_MESSAGES = 100;

interface ChatbotState {
  /** Last saved node data; the baseline for Discard and dirty checks. */
  savedFlow: ChatbotNodeData | null;
  /** Backend-generated chatbot id; null until the first save. */
  chatbotRef: string | null;
  /** Session the stored transcript belongs to (the cookie holds the active id). */
  messagesSessionId: string | null;
  messages: ChatbotChatMessage[];
  /** Last webhook event applied, so reconnects don't replay it. */
  lastEventSeq: number;
  hasHydrated: boolean;
}

interface ChatbotActions {
  setSavedFlow: (flow: ChatbotNodeData) => void;
  setChatbotRef: (ref: string) => void;
  /** Points the transcript at a session, clearing it if the session changed. */
  bindSession: (sessionId: string) => void;
  appendMessage: (message: ChatbotChatMessage) => void;
  removeMessage: (id: string) => void;
  setLastEventSeq: (seq: number) => void;
  setHasHydrated: (value: boolean) => void;
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
