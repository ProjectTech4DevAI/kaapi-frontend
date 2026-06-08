/**
 * ChatInput - Auto-growing textarea with a send button, attachments
 * (image / pdf, max 2) and drag-and-drop.
 */

"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { InfoIcon, MicIcon, PlusIcon, SendIcon } from "@/app/components/icons";
import { SendAttachment } from "@/app/lib/types/chat";
import {
  AttachmentChip,
  AttachmentPreviewModal,
  PreviewableAttachment,
} from "@/app/components/chat";

interface ChatInputProps {
  value: string;
  onChange: (next: string) => void;
  onSend: (attachments?: SendAttachment[]) => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
  helperText?: string;
  trailingAccessory?: ReactNode;
  onStartVoice?: () => void;
  voiceConfigReady?: boolean;
  textConfigReady?: boolean;
  onAttachmentError?: (message: string) => void;
}

const MAX_HEIGHT_PX = 200;
const MAX_FILES = 2;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_PDF_TYPE = "application/pdf";
const ACCEPT_ATTR = [...ALLOWED_IMAGE_TYPES, ALLOWED_PDF_TYPE].join(",");

interface AttachedFile {
  id: string;
  kind: "image" | "pdf";
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
}

function classifyMime(mime: string): "image" | "pdf" | null {
  if (ALLOWED_IMAGE_TYPES.includes(mime)) return "image";
  if (mime === ALLOWED_PDF_TYPE) return "pdf";
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  isPending = false,
  placeholder = "Message…",
  helperText,
  trailingAccessory,
  onStartVoice,
  voiceConfigReady,
  textConfigReady,
  onAttachmentError,
}: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<PreviewableAttachment | null>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const reportError = (msg: string) => {
    if (onAttachmentError) onAttachmentError(msg);
  };

  const ingestFiles = async (incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    if (list.length === 0) return;
    const rejected: string[] = [];
    const accepted: File[] = [];
    for (const file of list) {
      const kind = classifyMime(file.type);
      if (!kind) {
        rejected.push(file.name);
        continue;
      }
      accepted.push(file);
    }
    if (rejected.length) {
      reportError(
        `Unsupported file type: ${rejected.join(", ")}. Allowed: JPG, PNG, GIF, WebP, PDF.`,
      );
    }
    const room = MAX_FILES - attachments.length;
    const toAdd = accepted.slice(0, Math.max(0, room));
    if (accepted.length > toAdd.length) {
      reportError(`You can attach up to ${MAX_FILES} files at once.`);
    }

    const added: AttachedFile[] = await Promise.all(
      toAdd.map(async (file) => {
        const base64 = await readFileAsBase64(file);
        const kind = classifyMime(file.type) as "image" | "pdf";
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          kind,
          name: file.name,
          mimeType: file.type,
          base64,
          previewUrl: `data:${file.type};base64,${base64}`,
        };
      }),
    );
    if (added.length === 0) return;
    setAttachments((prev) => [...prev, ...added].slice(0, MAX_FILES));
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await ingestFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer?.types.includes("Files")) return;
    if (attachments.length >= MAX_FILES) return;
    dragCounterRef.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (attachments.length >= MAX_FILES) {
      reportError(`You can attach up to ${MAX_FILES} files at once.`);
      return;
    }
    if (e.dataTransfer?.files) await ingestFiles(e.dataTransfer.files);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if (!canSend) return;
    const payload: SendAttachment[] | undefined = attachments.length
      ? attachments.map((a) => ({
          kind: a.kind,
          name: a.name,
          mimeType: a.mimeType,
          base64: a.base64,
        }))
      : undefined;
    onSend(payload);
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = value.trim().length > 0 || attachments.length > 0;
  const canSend = !disabled && !isPending && hasContent;
  const canAttachMore = attachments.length < MAX_FILES;

  return (
    <div className="px-4 sm:px-6 pb-6 pt-2 bg-bg-primary">
      <div className="max-w-3xl mx-auto">
        <div
          className={`relative rounded-3xl border bg-bg-primary shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-colors ${
            isDragging
              ? "border-accent-primary bg-accent-primary/5"
              : "border-border"
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-start gap-2 px-3 pt-3">
              {attachments.map((a) => (
                <AttachmentChip
                  key={a.id}
                  file={a}
                  onRemove={() => removeAttachment(a.id)}
                  onPreview={() =>
                    setPreview({
                      kind: a.kind,
                      name: a.name,
                      mimeType: a.mimeType,
                      previewUrl: a.previewUrl,
                    })
                  }
                />
              ))}
            </div>
          )}

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="block w-full resize-none bg-transparent text-text-primary text-[15px] leading-6 px-5 pt-3 pb-1 outline-none placeholder:text-text-secondary disabled:opacity-60"
            style={{ maxHeight: MAX_HEIGHT_PX }}
          />
          <div className="flex items-center gap-2 px-3 pb-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isPending || !canAttachMore}
              aria-label="Attach files"
              title={
                canAttachMore
                  ? "Attach an image or PDF (max 2)"
                  : `You've attached the maximum ${MAX_FILES} files`
              }
              className={`shrink-0 w-9 h-9 rounded-full border border-border bg-bg-primary flex items-center justify-center transition-colors ${
                canAttachMore && !disabled && !isPending
                  ? "text-text-secondary hover:text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5 cursor-pointer"
                  : "text-text-secondary/40 opacity-60 cursor-not-allowed"
              }`}
            >
              <PlusIcon className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              multiple
              hidden
              onChange={handleFileInputChange}
            />
            <div className="flex-1" />
            {trailingAccessory && (
              <div className="flex items-center gap-2 min-w-0">
                {trailingAccessory}
              </div>
            )}
            {onStartVoice && (
              <button
                type="button"
                onClick={onStartVoice}
                disabled={disabled || isPending}
                aria-label="Start voice input"
                title={
                  voiceConfigReady === false
                    ? "Voice chat needs a Google + Speech-to-Text config"
                    : "Start voice input · requires Google + STT config"
                }
                className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  voiceConfigReady === false
                    ? "border-status-warning-border bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg/80"
                    : "border-border bg-bg-primary text-text-secondary hover:text-accent-primary hover:border-accent-primary hover:bg-accent-primary/5"
                }`}
              >
                <MicIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              aria-label="Send message"
              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                canSend
                  ? "bg-accent-primary text-white hover:bg-accent-secondary cursor-pointer"
                  : "bg-neutral-200 text-text-secondary cursor-not-allowed"
              }`}
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>

          {isDragging && (
            <div className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-dashed border-accent-primary bg-accent-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-accent-primary">
                Drop image or PDF to attach
              </span>
            </div>
          )}
        </div>
        {textConfigReady === false ? (
          <div className="mt-2 flex items-start justify-center gap-1.5 text-[11px] text-status-warning-text">
            <InfoIcon className="w-3 h-3 shrink-0 mt-[3px]" />
            <p className="text-center leading-snug wrap-break-word">
              This configuration is set up for{" "}
              <span className="font-semibold">Speech-to-Text</span> — pick a
              different config above to send text, or tap the microphone.
            </p>
          </div>
        ) : onStartVoice && voiceConfigReady === false ? (
          <div className="mt-2 flex items-start justify-center gap-1.5 text-[11px] text-status-warning-text">
            <InfoIcon className="w-3 h-3 shrink-0 mt-[3px]" />
            <p className="text-center leading-snug wrap-break-word">
              Voice chat needs a config with provider{" "}
              <span className="font-semibold">Google</span> and type{" "}
              <span className="font-semibold">Speech-to-Text</span> — pick a
              different config or update this one.
            </p>
          </div>
        ) : (
          <p className="text-center text-[11px] text-text-secondary mt-2">
            {helperText ?? "Press Enter to send, Shift+Enter for a new line."}
          </p>
        )}
      </div>
      <AttachmentPreviewModal
        attachment={preview}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
