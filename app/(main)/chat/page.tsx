/**
 * Chat - conversational interface.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import PageHeader from "@/app/components/PageHeader";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { LoginModal } from "@/app/components/auth";
import {
  ChatConfigPicker,
  ChatEmptyState,
  ChatInput,
  ChatMessageList,
} from "@/app/components/chat";
import VoiceInput from "@/app/components/chat/VoiceInput";
import { useConfigs } from "@/app/hooks";
import { useVoiceChat } from "@/app/hooks/useVoiceChat";
import {
  configToBlob,
  createLLMCall,
  extractAssistantText,
  pollLLMCall,
} from "@/app/lib/chatClient";
import { useChatStore } from "@/app/lib/store/chat";
import { ChatMessage, LLMCallRequest, LLMInput } from "@/app/lib/types/chat";

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
  const { configs, loadSingleVersion, allConfigMeta } = useConfigs({
    pageSize: 0,
  });

  const messages = useChatStore((s) => s.messages);
  const conversationId = useChatStore((s) => s.conversationId);
  const configId = useChatStore((s) => s.configId);
  const configVersion = useChatStore((s) => s.configVersion);
  const chatHydrated = useChatStore((s) => s.hasHydrated);
  const appendMessages = useChatStore((s) => s.appendMessages);
  const updateMessageInStore = useChatStore((s) => s.updateMessage);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setConfig = useChatStore((s) => s.setConfig);
  const clearConversation = useChatStore((s) => s.clearConversation);

  const [draft, setDraft] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Trigger persisted-state rehydration on mount.
  useEffect(() => {
    useChatStore.persist.rehydrate();
  }, []);

  // Cancel any in-flight poll when leaving the page.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleNewChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    clearConversation();
    setIsPending(false);
  }, [clearConversation]);

  const handleConfigSelect = useCallback(
    (newConfigId: string, newVersion: number) => {
      const isDifferent =
        newConfigId !== configId || newVersion !== configVersion;
      setConfig(newConfigId, newVersion);
      if (isDifferent) {
        clearConversation();
      }
    },
    [clearConversation, configId, configVersion, setConfig],
  );

  const sendMessage = useCallback(
    async (
      input:
        | { kind: "text"; text: string }
        | {
            kind: "audio";
            base64: string;
            mimeType: string;
            transcript?: string;
          },
    ): Promise<string | null> => {
      if (input.kind === "text" && !input.text.trim()) return null;

      if (!isAuthenticated) {
        setShowLoginModal(true);
        return null;
      }
      if (!configId || !configVersion) {
        if (allConfigMeta.length === 0) {
          toast.error(
            "No configurations yet — create one in Configurations → Prompt Editor first.",
          );
        } else {
          toast.error("Select a configuration before sending a message.");
        }
        return null;
      }

      const userMessage: ChatMessage = {
        id: genId(),
        role: "user",
        content:
          input.kind === "text"
            ? input.text.trim()
            : (input.transcript?.trim() ?? ""),
        createdAt: Date.now(),
        status: "complete",
        isVoice: input.kind === "audio",
      };
      const assistantMessage: ChatMessage = {
        id: genId(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        status: "pending",
      };

      appendMessages(userMessage, assistantMessage);
      if (input.kind === "text") setDraft("");
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

        const apiInput: LLMInput =
          input.kind === "text"
            ? input.text.trim()
            : {
                type: "audio",
                content: {
                  format: "base64",
                  value: input.base64,
                  mime_type: input.mimeType,
                },
              };
        if (input.kind === "audio") {
          console.log("[chat] audio base64:", input.base64);
        }

        const payload: LLMCallRequest = {
          query: {
            input: apiInput,
            conversation: conversationId
              ? { id: conversationId }
              : { auto_create: true },
          },
          config: { blob: configToBlob(fullConfig) },
          include_provider_raw_response: true,
        };

        const created = await createLLMCall(payload, apiKey);
        if (!created.success || !created.data?.job_id) {
          throw new Error(created.error || "Failed to start the request");
        }
        const jobId = created.data.job_id;
        updateMessageInStore(assistantMessage.id, { jobId });

        const result = await pollLLMCall(jobId, apiKey, {
          signal: controller.signal,
        });

        const text = extractAssistantText(result.llm_response?.response);
        const newConversationId =
          result.llm_response?.response?.conversation_id ?? conversationId;
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }

        updateMessageInStore(assistantMessage.id, {
          content:
            text ||
            "(The assistant returned an empty response — try again or pick a different configuration.)",
          status: "complete",
        });
        return text || null;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          updateMessageInStore(assistantMessage.id, {
            status: "error",
            content: "Cancelled.",
            error: "Cancelled",
          });
          return null;
        }
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        updateMessageInStore(assistantMessage.id, {
          status: "error",
          content: message,
          error: message,
        });
        toast.error(message);
        return null;
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        setIsPending(false);
      }
    },
    [
      allConfigMeta,
      apiKey,
      appendMessages,
      configId,
      configVersion,
      configs,
      conversationId,
      isAuthenticated,
      loadSingleVersion,
      setConversationId,
      toast,
      updateMessageInStore,
    ],
  );

  const handleVoiceSubmit = useCallback(
    async (audio: { base64: string; mimeType: string; transcript: string }) =>
      sendMessage({
        kind: "audio",
        base64: audio.base64,
        mimeType: audio.mimeType,
        transcript: audio.transcript,
      }),
    [sendMessage],
  );

  const voice = useVoiceChat({ onSubmitAudio: handleVoiceSubmit });

  // Live check used to render the inline requirement hint near the mic
  // button. Synchronous — returns true only when the cached config we
  // already have on hand is a Google STT config.
  const activeConfig = configs.find(
    (c) => c.config_id === configId && c.version === configVersion,
  );
  const voiceConfigReady =
    !!activeConfig &&
    activeConfig.provider?.toLowerCase() === "google" &&
    activeConfig.type?.toLowerCase() === "stt";

  const handleStartVoice = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!configId || !configVersion) {
      if (allConfigMeta.length === 0) {
        toast.error(
          "No configurations yet — create one in Configurations → Prompt Editor first.",
        );
      } else {
        toast.error("Select a configuration before starting voice chat.");
      }
      return;
    }
    // Voice chat needs a Google STT config — the backend only routes
    // audio input correctly when provider === "google" + type === "stt".
    // Load the full config if it isn't cached so the check is reliable.
    const cached = configs.find(
      (c) => c.config_id === configId && c.version === configVersion,
    );
    const fullConfig =
      cached ?? (await loadSingleVersion(configId, configVersion));
    if (!fullConfig) {
      toast.error("Couldn't load the selected configuration. Try again.");
      return;
    }
    const provider = fullConfig.provider?.toLowerCase();
    const type = fullConfig.type?.toLowerCase();
    if (provider !== "google" || type !== "stt") {
      toast.error(
        "Voice chat needs a config with provider “Google” and type “Speech-to-Text”. Pick a different config above, or update this one in Configurations → Prompt Editor.",
      );
      return;
    }
    voice.start();
  }, [
    allConfigMeta,
    configId,
    configs,
    configVersion,
    isAuthenticated,
    loadSingleVersion,
    toast,
    voice,
  ]);

  const isVoiceActive = voice.status !== "idle" && voice.status !== "error";

  const hasConversation = messages.length > 0;
  const hasConfig = !!configId && !!configVersion;
  const isReady = isHydrated && chatHydrated;

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/chat" />

        <div className="flex-1 flex flex-col overflow-hidden bg-bg-primary">
          <PageHeader
            title="Chat"
            subtitle="Ask anything - answers come from your selected configuration"
            actions={
              hasConversation ? (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-bg-primary text-text-primary hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  New chat
                </button>
              ) : null
            }
          />

          {!isReady ? (
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
                sendMessage({ kind: "text", text });
              }}
            />
          )}

          {isVoiceActive ? (
            <VoiceInput
              status={voice.status}
              audioLevel={voice.audioLevel}
              transcript={voice.transcript}
              onCancel={voice.cancel}
              onSubmit={voice.submit}
            />
          ) : (
            <ChatInput
              value={draft}
              onChange={setDraft}
              onSend={() => sendMessage({ kind: "text", text: draft })}
              isPending={isPending}
              onStartVoice={handleStartVoice}
              voiceConfigReady={hasConfig ? voiceConfigReady : undefined}
              placeholder={
                !isAuthenticated
                  ? "Log in to start chatting…"
                  : !hasConfig
                    ? "Select a configuration to start chatting…"
                    : "Message your assistant…"
              }
              trailingAccessory={
                isAuthenticated ? (
                  <ChatConfigPicker
                    configId={configId}
                    version={configVersion}
                    onSelect={handleConfigSelect}
                    disabled={isPending}
                    openUp
                  />
                ) : null
              }
            />
          )}
        </div>
      </div>

      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
}
