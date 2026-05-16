/**
 * Keystore: API Key Management Interface
 * Allows users to securely store and manage API keys for various LLM providers.
 */

"use client";

import { useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import { PageHeader } from "@/app/components";
import KeysCard from "@/app/components/keystore/KeysCard";
import AddKeyModal from "@/app/components/keystore/AddKeyModal";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useApp } from "@/app/lib/context/AppContext";
import { useToast } from "@/app/components/ui/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import { APIKey } from "@/app/lib/types/credentials";

export const STORAGE_KEY = "kaapi_api_keys";

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
  const [isValidating, setIsValidating] = useState(false);

  const resetForm = () => {
    setNewKeyLabel("");
    setNewKeyValue("");
    setNewKeyProvider("Kaapi");
  };

  const handleAddKey = async () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      toast.error("Please provide both a label and an API key");
      return;
    }

    const trimmedKey = newKeyValue.trim();
    setIsValidating(true);

    try {
      await apiFetch("/api/apikeys/verify", trimmedKey);
    } catch (err) {
      console.error("API key validation failed:", err);
      toast.error("Invalid API key. Please check the key and try again.");
      setIsValidating(false);
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      label: newKeyLabel.trim(),
      key: trimmedKey,
      provider: newKeyProvider,
      createdAt: new Date().toISOString(),
    };

    addKey(newKey);
    resetForm();
    setIsModalOpen(false);
    setIsValidating(false);
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
        isValidating={isValidating}
        onLabelChange={setNewKeyLabel}
        onValueChange={setNewKeyValue}
        onProviderChange={setNewKeyProvider}
        onAddKey={handleAddKey}
        onClose={closeAddModal}
      />
    </div>
  );
}
