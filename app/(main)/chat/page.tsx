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
  extractAssistantAudio,
  extractAssistantText,
  pollLLMCall,
} from "@/app/lib/chatClient";
import { useChatStore } from "@/app/lib/store/chat";
import {
  ChatMessage,
  LLMCallRequest,
  LLMInput,
  SendInput,
} from "@/app/lib/types/chat";
import { SavedConfig } from "@/app/lib/types/configs";

function genId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildUserMessage(input: SendInput): ChatMessage {
  return {
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
}

function buildLLMInput(input: SendInput): LLMInput {
  if (input.kind === "text") return input.text.trim();
  return {
    type: "audio",
    content: {
      format: "base64",
      value: input.base64,
      mime_type: input.mimeType,
    },
  };
}

function buildPayload(
  input: SendInput,
  fullConfig: SavedConfig,
  conversationId: string | null,
): LLMCallRequest {
  return {
    query: {
      input: buildLLMInput(input),
      conversation: conversationId
        ? { id: conversationId }
        : { auto_create: true },
    },
    config: { blob: configToBlob(fullConfig) },
    include_provider_raw_response: true,
  };
}

/**
 * Run the full create-then-poll cycle for an LLM call. Returns the
 * extracted assistant text plus the job id and any new conversation id.
 */
async function executeChatCall(args: {
  input: SendInput;
  fullConfig: SavedConfig;
  conversationId: string | null;
  apiKey: string;
  signal: AbortSignal;
}): Promise<{
  text: string;
  audio: { url: string; mimeType: string } | null;
  jobId: string;
  conversationId: string | null;
}> {
  const payload = buildPayload(
    args.input,
    args.fullConfig,
    args.conversationId,
  );
  const created = await createLLMCall(payload, args.apiKey);
  if (!created.success || !created.data?.job_id) {
    throw new Error(created.error || "Failed to start the request");
  }
  const jobId = created.data.job_id;
  const result = await pollLLMCall(jobId, args.apiKey, { signal: args.signal });
  const response = result.llm_response?.response;
  const audio = extractAssistantAudio(response);
  const text = audio ? "" : extractAssistantText(response);
  const newConversationId = response?.conversation_id ?? args.conversationId;
  return { text, audio, jobId, conversationId: newConversationId };
}

function checkTextConfig(
  config: SavedConfig | null | undefined,
): string | null {
  if (!config) return "Couldn't load the selected configuration. Try again.";
  const type = config.type?.toLowerCase();
  if (type === "stt") {
    return "This configuration is set up for Speech-to-Text. Pick a different config above (or tap the microphone to send a voice message).";
  }
  return null;
}

function checkVoiceConfig(
  config: SavedConfig | null | undefined,
): string | null {
  if (!config) return "Couldn't load the selected configuration. Try again.";
  const provider = config.provider?.toLowerCase();
  const type = config.type?.toLowerCase();
  if (provider !== "google" || type !== "stt") {
    return "Voice chat needs a config with provider “Google” and type “Speech-to-Text”. Pick a different config above, or update this one in Configurations → Prompt Editor.";
  }
  return null;
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
    async (input: SendInput): Promise<string | null> => {
      if (input.kind === "text" && !input.text.trim()) return null;

      if (!isAuthenticated) {
        setShowLoginModal(true);
        return null;
      }
      if (!configId || !configVersion) {
        const msg =
          allConfigMeta.length === 0
            ? "No configurations yet — create one in Configurations → Prompt Editor first."
            : "Select a configuration before sending a message.";
        toast.error(msg);
        return null;
      }

      if (input.kind === "text") {
        const cached = configs.find(
          (c) => c.config_id === configId && c.version === configVersion,
        );
        if (cached) {
          const err = checkTextConfig(cached);
          if (err) {
            toast.error(err);
            return null;
          }
        }
      }

      const userMessage = buildUserMessage(input);
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

      const finishAbort = () => {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsPending(false);
        }
      };

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

        if (input.kind === "text") {
          const textErr = checkTextConfig(fullConfig);
          if (textErr) throw new Error(textErr);
        }

        const {
          text,
          audio,
          jobId,
          conversationId: newConversationId,
        } = await executeChatCall({
          input,
          fullConfig,
          conversationId,
          apiKey,
          signal: controller.signal,
        });
        updateMessageInStore(assistantMessage.id, { jobId });
        if (newConversationId && newConversationId !== conversationId) {
          setConversationId(newConversationId);
        }
        if (audio) {
          updateMessageInStore(assistantMessage.id, {
            content: "",
            audio,
            status: "complete",
          });
        } else {
          updateMessageInStore(assistantMessage.id, {
            content:
              text ||
              "(The assistant returned an empty response — try again or pick a different configuration.)",
            status: "complete",
          });
        }
        finishAbort();
        return text || null;
      } catch (err) {
        const isAbort = (err as Error)?.name === "AbortError";
        const message = isAbort
          ? "Cancelled."
          : err instanceof Error
            ? err.message
            : "Something went wrong";
        updateMessageInStore(assistantMessage.id, {
          status: "error",
          content: message,
          error: message,
        });
        if (!isAbort) toast.error(message);
        finishAbort();
        return null;
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

  const activeConfig = configs.find(
    (c) => c.config_id === configId && c.version === configVersion,
  );
  const voiceConfigReady =
    !!activeConfig &&
    activeConfig.provider?.toLowerCase() === "google" &&
    activeConfig.type?.toLowerCase() === "stt";
  const textConfigReady =
    !activeConfig || (activeConfig.type?.toLowerCase() ?? "text") !== "stt";

  const handleStartVoice = useCallback(async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    if (!configId || !configVersion) {
      const msg =
        allConfigMeta.length === 0
          ? "No configurations yet — create one in Configurations → Prompt Editor first."
          : "Select a configuration before starting voice chat.";
      toast.error(msg);
      return;
    }
    const cached = configs.find(
      (c) => c.config_id === configId && c.version === configVersion,
    );
    if (cached) {
      const err = checkVoiceConfig(cached);
      if (err) {
        toast.error(err);
        return;
      }
      voice.start();
      return;
    }

    const fullConfig = await loadSingleVersion(configId, configVersion);
    const voiceError = checkVoiceConfig(fullConfig);
    if (voiceError) {
      toast.error(voiceError);
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
              textConfigReady={hasConfig ? textConfigReady : undefined}
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
