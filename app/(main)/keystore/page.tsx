/**
 * Keystore: API Key Management Interface
 * Allows users to securely store and manage API keys for various LLM providers.
 */

"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { Button, Field, Modal, PageHeader } from "@/app/components";
import Select from "@/app/components/Select";
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
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/components/Toast";
import { APIKey } from "@/app/lib/types/credentials";

export const STORAGE_KEY = "kaapi_api_keys";

const PROVIDERS = [{ value: "Kaapi", label: "Kaapi" }];

export default function KaapiKeystore() {
  const { sidebarCollapsed } = useApp();
  const { apiKeys, addKey, removeKey: removeApiKey } = useAuth();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState("Kaapi");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const resetForm = () => {
    setNewKeyLabel("");
    setNewKeyValue("");
    setNewKeyProvider("Kaapi");
  };

  const handleAddKey = () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast.error("Please provide both a label and an API key");
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      label: newKeyLabel.trim(),
      key: newKeyValue.trim(),
      provider: newKeyProvider,
      createdAt: new Date().toISOString(),
    };

    addKey(newKey);
    resetForm();
    setIsModalOpen(false);
    toast.success("API key added successfully");
  };

  const handleDeleteKey = (id: string) => {
    removeApiKey(id);
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.success("API key removed");
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(id);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopiedKeyId(null), 1500);
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  const closeAddModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-primary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/keystore" />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Keystore"
            subtitle="Manage your API keys securely"
          />

          <div className="flex-1 overflow-auto p-6 bg-bg-primary">
            <div className="max-w-3xl mx-auto">
              <KeysCard
                apiKeys={apiKeys}
                visibleKeys={visibleKeys}
                copiedKeyId={copiedKeyId}
                onToggleVisibility={toggleKeyVisibility}
                onCopy={copyToClipboard}
                onDelete={handleDeleteKey}
                onAddNew={() => setIsModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <AddKeyModal
        open={isModalOpen}
        newKeyLabel={newKeyLabel}
        newKeyValue={newKeyValue}
        newKeyProvider={newKeyProvider}
        onLabelChange={setNewKeyLabel}
        onValueChange={setNewKeyValue}
        onProviderChange={setNewKeyProvider}
        onAddKey={handleAddKey}
        onClose={closeAddModal}
      />
    </div>
  );
}

interface KeysCardProps {
  apiKeys: APIKey[];
  visibleKeys: Set<string>;
  copiedKeyId: string | null;
  onToggleVisibility: (id: string) => void;
  onCopy: (text: string, id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

function KeysCard({
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
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-text-primary text-bg-primary">
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

interface AddKeyModalProps {
  open: boolean;
  newKeyLabel: string;
  newKeyValue: string;
  newKeyProvider: string;
  onLabelChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onAddKey: () => void;
  onClose: () => void;
}

function AddKeyModal({
  open,
  newKeyLabel,
  newKeyValue,
  newKeyProvider,
  onLabelChange,
  onValueChange,
  onProviderChange,
  onAddKey,
  onClose,
}: AddKeyModalProps) {
  const isDisabled = !newKeyLabel.trim() || !newKeyValue.trim();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New API Key"
      maxWidth="max-w-lg"
    >
      <div className="px-6 pb-2">
        <p className="text-sm mb-5 text-text-secondary">
          Add a new API key to use in your evaluation workflows. Keys are stored
          locally in your browser.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Provider
            </label>
            <Select
              value={newKeyProvider}
              onChange={(e) => onProviderChange(e.target.value)}
              options={PROVIDERS}
            />
          </div>

          <Field
            label="Label"
            value={newKeyLabel}
            onChange={onLabelChange}
            placeholder="e.g., Production Key"
          />

          <Field
            label="API Key"
            type="password"
            value={newKeyValue}
            onChange={onValueChange}
            placeholder="Paste your API key here"
          />
        </div>

        <div className="mt-5 rounded-md p-3 bg-accent-primary/5 border border-accent-primary/20">
          <div className="flex gap-2">
            <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-accent-primary" />
            <p className="text-xs text-text-secondary">
              API keys are stored in your browser&apos;s local storage.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onAddKey} disabled={isDisabled}>
          Add API Key
        </Button>
      </div>
    </Modal>
  );
}
