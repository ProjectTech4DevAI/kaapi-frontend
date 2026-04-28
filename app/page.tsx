"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { LoginModal } from "@/app/components/auth";
import {
  ChatConfigPicker,
  ChatEmptyState,
  ChatInput,
  ChatMessageList,
} from "@/app/components/chat";
import { useConfigs } from "@/app/hooks";
import {
  buildCallbackUrl,
  configToBlob,
  createLLMCall,
  extractAssistantText,
  generateCallbackId,
  pollLLMCall,
} from "@/app/lib/chatClient";
import {
  ChatMessage,
  LLMCallRequest,
  StoredSelection,
} from "@/app/lib/types/chat";

const SELECTION_STORAGE_KEY = "kaapi_chat_selection";

function loadStoredSelection(): StoredSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelection;
    if (parsed && parsed.configId && parsed.version) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ChatPage() {
  const { sidebarCollapsed } = useApp();
  const { isAuthenticated, activeKey, isHydrated } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();
  const { configs, loadSingleVersion } = useConfigs({ pageSize: 0 });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [configId, setConfigId] = useState("");
  const [configVersion, setConfigVersion] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Restore last-used config selection so users don't re-pick across reloads.
  useEffect(() => {
    const stored = loadStoredSelection();
    if (stored) {
      setConfigId(stored.configId);
      setConfigVersion(stored.version);
    }
  }, []);

  useEffect(() => {
    if (!configId || !configVersion) return;
    try {
      window.localStorage.setItem(
        SELECTION_STORAGE_KEY,
        JSON.stringify({ configId, version: configVersion }),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [configId, configVersion]);

  // Cancel any in-flight poll when leaving the page.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [],
  );

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId(null);
    setIsPending(false);
  }, []);

  const handleConfigSelect = useCallback(
    (newConfigId: string, newVersion: number) => {
      const isDifferent =
        newConfigId !== configId || newVersion !== configVersion;
      setConfigId(newConfigId);
      setConfigVersion(newVersion);
      if (isDifferent) {
        setConversationId(null);
        setMessages([]);
      }
    },
    [configId, configVersion],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (!isAuthenticated) {
        setShowLoginModal(true);
        return;
      }
      if (!configId || !configVersion) {
        toast.error("Select a configuration before sending a message.");
        return;
      }

      const userMessage: ChatMessage = {
        id: genId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
        status: "complete",
      };
      const assistantMessage: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        status: "pending",
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setDraft("");
      setIsPending(true);

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      try {
        const cached = configs.find(
          (c) => c.config_id === configId && c.version === configVersion,
        );
        const fullConfig =
          cached ?? (await loadSingleVersion(configId, configVersion));
        if (!fullConfig) {
          throw new Error(
            "Couldn't load the selected configuration. Try picking it again.",
          );
        }

        const callbackId = generateCallbackId();
        const payload: LLMCallRequest = {
          query: {
            input: trimmed,
            conversation: conversationId
              ? { id: conversationId }
              : { auto_create: true },
          },
          config: { blob: configToBlob(fullConfig) },
          callback_url: buildCallbackUrl(callbackId),
          include_provider_raw_response: true,
        };

        updateMessage(assistantMessage.id, { jobId: callbackId });

        const created = await createLLMCall(payload, apiKey);
        if (!created.success) {
          throw new Error(created.error || "Failed to start the request");
        }

        const result = await pollLLMCall(callbackId, apiKey, {
          signal: controller.signal,
        });

        const text = extractAssistantText(result.llm_response?.response);
        const newConversationId =
          result.llm_response?.response?.conversation_id ?? conversationId;
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        updateMessage(assistantMessage.id, {
          content:
            text ||
            "(The assistant returned an empty response — try again or pick a different configuration.)",
          status: "complete",
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          updateMessage(assistantMessage.id, {
            status: "error",
            content: "Cancelled.",
            error: "Cancelled",
          });
          return;
        }
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        updateMessage(assistantMessage.id, {
          status: "error",
          content: message,
          error: message,
        });
        toast.error(message);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsPending(false);
      }
    },
    [
      apiKey,
      configId,
      configVersion,
      configs,
      conversationId,
      isAuthenticated,
      loadSingleVersion,
      toast,
      updateMessage,
    ],
  );

  const hasConversation = messages.length > 0;
  const hasConfig = !!configId && !!configVersion;

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Chat"
            subtitle="Ask anything - answers come from your selected configuration"
            actions={
              <div className="flex items-center gap-2">
                {hasConversation && (
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-bg-primary text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    New chat
                  </button>
                )}
                {isAuthenticated && (
                  <ChatConfigPicker
                    configId={configId}
                    version={configVersion}
                    onSelect={handleConfigSelect}
                    disabled={isPending}
                  />
                )}
              </div>
            }
          />

          {!isHydrated ? (
            <div className="flex-1" />
          ) : hasConversation ? (
            <ChatMessageList messages={messages} />
          ) : (
            <ChatEmptyState
              hasConfig={hasConfig}
              isAuthenticated={isAuthenticated}
              onSuggestion={(text) => {
                if (!isAuthenticated) {
                  setShowLoginModal(true);
                  return;
                }
                sendMessage(text);
              }}
            />
          )}

          <ChatInput
            value={draft}
            onChange={setDraft}
            onSend={() => sendMessage(draft)}
            isPending={isPending}
            placeholder={
              !isAuthenticated
                ? "Log in to start chatting…"
                : !hasConfig
                  ? "Select a configuration to start chatting…"
                  : "Message your assistant…"
            }
          />
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
