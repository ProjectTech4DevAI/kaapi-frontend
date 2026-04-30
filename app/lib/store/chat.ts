"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { STORAGE_KEYS } from "@/app/lib/constants";
import { ChatMessage } from "@/app/lib/types/chat";

const LEGACY_SELECTION_KEY = "kaapi_chat_selection";

const MAX_PERSISTED_MESSAGES = 50;

interface ChatState {
  messages: ChatMessage[];
  conversationId: string | null;
  configId: string;
  configVersion: number;
  hasHydrated: boolean;
}

interface ChatActions {
  setMessages: (
    next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  appendMessages: (...messages: ChatMessage[]) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setConversationId: (id: string | null) => void;
  setConfig: (configId: string, version: number) => void;
  clearConversation: () => void;
  reset: () => void;
  setHasHydrated: (value: boolean) => void;
}

const INITIAL_STATE: ChatState = {
  messages: [],
  conversationId: null,
  configId: "",
  configVersion: 0,
  hasHydrated: false,
};

function trim(messages: ChatMessage[]): ChatMessage[] {
  return messages.length > MAX_PERSISTED_MESSAGES
    ? messages.slice(-MAX_PERSISTED_MESSAGES)
    : messages;
}

export const useChatStore = create<ChatState & ChatActions>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setMessages: (next) =>
        set((state) => ({
          messages: trim(
            typeof next === "function" ? next(state.messages) : next,
          ),
        })),

      appendMessages: (...incoming) =>
        set((state) => ({ messages: trim([...state.messages, ...incoming]) })),

      updateMessage: (id, patch) =>
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        })),

      setConversationId: (id) => set({ conversationId: id }),

      setConfig: (configId, version) =>
        set({ configId, configVersion: version }),

      clearConversation: () => set({ messages: [], conversationId: null }),

      reset: () => set({ ...INITIAL_STATE, hasHydrated: true }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: STORAGE_KEYS.CHAT_STATE,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        messages: state.messages,
        conversationId: state.conversationId,
        configId: state.configId,
        configVersion: state.configVersion,
      }),
      // Surface in-flight requests interrupted by a refresh as errors so the
      // UI doesn't show a permanent spinner.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<ChatState>;
        const messages = (persisted.messages ?? []).map((m) =>
          m.status === "pending"
            ? {
                ...m,
                status: "error" as const,
                content: "Request interrupted — please send the message again.",
                error: "Interrupted",
                jobId: undefined,
              }
            : m,
        );
        return { ...currentState, ...persisted, messages };
      },
      onRehydrateStorage: () => (state) => {
        // One-time migration: seed config selection from the pre-store key
        // so existing users don't lose their last picked configuration.
        if (state && !state.configId && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(LEGACY_SELECTION_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as {
                configId?: string;
                version?: number;
              };
              if (parsed?.configId && parsed?.version) {
                useChatStore.setState({
                  configId: parsed.configId,
                  configVersion: parsed.version,
                });
              }
              window.localStorage.removeItem(LEGACY_SELECTION_KEY);
            }
          } catch {
            /* ignore malformed legacy data */
          }
        }
        useChatStore.setState({ hasHydrated: true });
      },
    },
  ),
);
