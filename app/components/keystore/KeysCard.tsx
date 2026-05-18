"use client";

import { Button } from "@/app/components/ui";
import {
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  TrashIcon,
  KeyIcon,
  InfoIcon,
  PlusIcon,
  CheckLineIcon,
} from "@/app/components/icons";
import { APIKey } from "@/app/lib/types/credentials";

interface KeysCardProps {
  apiKeys: APIKey[];
  visibleKeys: Set<string>;
  copiedKeyId: string | null;
  onToggleVisibility: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export default function KeysCard({
  apiKeys,
  visibleKeys,
  copiedKeyId,
  onToggleVisibility,
  onCopy,
  onDelete,
  onAddNew,
}: KeysCardProps) {
  return (
    <div className="rounded-lg p-6 bg-bg-primary shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text-primary">
          Your API Key
        </h2>
      </div>

      {apiKeys.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
            <KeyIcon className="w-7 h-7 text-accent-primary" />
          </div>
          <p className="text-base font-semibold text-text-primary mb-1">
            No API key stored yet
          </p>
          <p className="text-sm text-text-secondary mb-5">
            Add your API key to get started with evaluations.
          </p>
          <Button variant="primary" size="md" onClick={onAddNew}>
            <PlusIcon className="w-4 h-4" />
            Add API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <InlineNotice>
            Only one API key can be stored at a time. Delete this key to add a
            different one.
          </InlineNotice>

          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="rounded-lg p-4 bg-bg-secondary">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                      {apiKey.provider}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {apiKey.label}
                    </h3>
                  </div>
                  <code className="block text-xs px-3 py-1.5 rounded-md font-mono break-all bg-bg-primary border border-border text-text-primary">
                    {visibleKeys.has(apiKey.id) ? apiKey.key : "•".repeat(32)}
                  </code>
                  <p className="text-xs mt-2 text-text-secondary">
                    Added {new Date(apiKey.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconButton
                    onClick={() => onToggleVisibility(apiKey.id)}
                    title={visibleKeys.has(apiKey.id) ? "Hide" : "Show"}
                  >
                    {visibleKeys.has(apiKey.id) ? <EyeOffIcon /> : <EyeIcon />}
                  </IconButton>
                  <IconButton
                    onClick={() => onCopy(apiKey.key, apiKey.id)}
                    title={copiedKeyId === apiKey.id ? "Copied" : "Copy"}
                  >
                    {copiedKeyId === apiKey.id ? (
                      <CheckLineIcon className="w-4 h-4 text-status-success" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </IconButton>
                  <IconButton
                    onClick={() => onDelete(apiKey.id)}
                    tone="danger"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </IconButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3 bg-status-warning-bg border border-status-warning-border">
      <div className="flex gap-2">
        <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-status-warning-text" />
        <p className="text-xs text-status-warning-text">{children}</p>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  title,
  tone = "default",
  children,
}: {
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-status-error-border bg-bg-primary text-status-error-text hover:bg-status-error-bg"
      : "border-border bg-bg-primary text-text-secondary hover:bg-neutral-50 hover:text-text-primary";

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded-md border transition-colors cursor-pointer ${toneClass}`}
    >
      {children}
    </button>
  );
}
