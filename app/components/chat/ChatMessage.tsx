/**
 * ChatMessage - Renders a single message bubble (user or assistant).
 */

"use client";

import { useState } from "react";
import { ChatMessage as ChatMessageType } from "@/app/lib/types/chat";
import {
  ChatIcon,
  CheckLineIcon,
  CopyIcon,
  MicIcon,
  SpeakerIcon,
} from "@/app/components/icons";
import { useTextToSpeech } from "@/app/hooks/useTextToSpeech";

interface ChatMessageProps {
  message: ChatMessageType;
}

interface WordSegment {
  text: string;
  start: number;
  isWord: boolean;
}

function tokenizeWords(text: string): WordSegment[] {
  const segments: WordSegment[] = [];
  const re = /(\S+|\s+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const value = match[0];
    segments.push({
      text: value,
      start: match.index,
      isWord: !/^\s+$/.test(value),
    });
  }
  return segments;
}

function VoiceMessageBody() {
  return (
    <span className="inline-flex items-center gap-2.5 align-middle">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-primary/10 text-accent-primary shrink-0">
        <MicIcon className="w-3.5 h-3.5" />
      </span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[13px] font-medium text-text-primary">
          Voice message
        </span>
        <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
          {[8, 14, 20, 10, 18, 12, 22, 14, 8, 16, 10, 18, 12].map((h, i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-accent-primary/40"
              style={{ height: `${h * 0.6}px` }}
            />
          ))}
        </span>
      </span>
    </span>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.2s_infinite]" />
      <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-[chat-pulse_1.4s_ease-in-out_0.4s_infinite]" />
    </div>
  );
}

/**
 * Renders the assistant text with optional karaoke highlight.
 */
function AssistantBody({
  text,
  charIndex,
  baseClass,
  trailing,
}: {
  text: string;
  charIndex: number | null;
  baseClass: string;
  trailing?: React.ReactNode;
}) {
  const segments = tokenizeWords(text);
  const isKaraoke = typeof charIndex === "number";
  return (
    <div
      className={`${baseClass} whitespace-pre-wrap wrap-break-word transition-colors`}
    >
      {segments.map((seg, i) => {
        if (!seg.isWord) return <span key={i}>{seg.text}</span>;
        const isRead = !isKaraoke || seg.start <= charIndex;
        return (
          <span
            key={i}
            className={
              isRead
                ? "text-text-primary transition-colors duration-150"
                : "text-text-secondary/60 transition-colors duration-150"
            }
          >
            {seg.text}
          </span>
        );
      })}
      {trailing}
    </div>
  );
}

function AssistantAudioPlayer({
  url,
  mimeType,
}: {
  url: string;
  mimeType: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-2xl bg-status-error-bg text-status-error-text border border-status-error-border px-3 py-2 text-[13px]">
        <SpeakerIcon className="w-4 h-4 shrink-0" />
        <span>
          Audio is no longer available (the signed URL may have expired).
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col gap-2 rounded-2xl bg-bg-secondary px-3 py-2 max-w-full">
      <div className="flex items-center gap-2 text-[12px] font-medium text-text-secondary">
        <SpeakerIcon className="w-3.5 h-3.5 text-accent-primary" />
        <span>Voice reply</span>
      </div>
      <audio
        src={url}
        controls
        preload="metadata"
        onError={() => setError(true)}
        className="max-w-full"
      >
        <source src={url} type={mimeType} />
        Your browser doesn&apos;t support inline audio playback.
      </audio>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessageType }) {
  const isPending = message.status === "pending";
  const isError = message.status === "error";
  const baseClass = `text-[15px] leading-relaxed ${
    isError ? "text-status-error" : "text-text-primary"
  }`;

  const { isSpeaking, charIndex, speak, stop } = useTextToSpeech();
  const [copied, setCopied] = useState(false);

  const handleSpeak = () => {
    if (isSpeaking) stop();
    else speak(message.content);
  };

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const hasAudio = !!message.audio?.url;
  const showToolbar = !isPending && !isError && !hasAudio && !!message.content;

  return (
    <div className="flex gap-3 px-4 sm:px-6">
      <div className="w-8 h-8 rounded-full bg-accent-primary text-white flex items-center justify-center shrink-0 mt-1">
        <ChatIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        {isPending && !message.content && !hasAudio ? (
          <ThinkingDots />
        ) : hasAudio && message.audio ? (
          <AssistantAudioPlayer
            url={message.audio.url}
            mimeType={message.audio.mimeType}
          />
        ) : (
          <AssistantBody
            text={message.content}
            charIndex={isSpeaking ? charIndex : null}
            baseClass={baseClass}
            trailing={
              isPending && message.content ? (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom bg-text-primary animate-pulse" />
              ) : null
            }
          />
        )}
        {showToolbar && (
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={handleSpeak}
              title={isSpeaking ? "Stop reading" : "Read aloud"}
              aria-label={isSpeaking ? "Stop reading" : "Read aloud"}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                isSpeaking
                  ? "text-accent-primary bg-accent-primary/10"
                  : "text-text-secondary hover:text-text-primary hover:bg-neutral-100"
              }`}
            >
              <SpeakerIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied" : "Copy"}
              aria-label={copied ? "Copied" : "Copy"}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              {copied ? (
                <CheckLineIcon className="w-4 h-4 text-status-success" />
              ) : (
                <CopyIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    const isVoiceWithoutTranscript =
      !!message.isVoice && !message.content.trim();
    return (
      <div className="flex justify-end px-4 sm:px-6">
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl bg-neutral-100 px-4 py-2.5 text-[15px] leading-relaxed text-text-primary whitespace-pre-wrap wrap-break-word">
          {isVoiceWithoutTranscript ? (
            <VoiceMessageBody />
          ) : (
            <>
              {message.isVoice && (
                <span
                  className="mr-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary/10 text-accent-primary align-text-bottom"
                  title="Voice message"
                  aria-label="Voice message"
                >
                  <MicIcon className="w-3 h-3" />
                </span>
              )}
              {message.content}
            </>
          )}
        </div>
      </div>
    );
  }

  return <AssistantMessage message={message} />;
}
