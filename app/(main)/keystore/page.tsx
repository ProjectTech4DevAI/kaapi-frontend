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
import { useToast } from "@/app/hooks/useToast";

export default function KaapiKeystore() {
  const { sidebarCollapsed } = useApp();
  const { apiKeys, addKey, removeKey: removeApiKey } = useAuth();
  const toast = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState("Kaapi");
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

    setIsValidating(true);
    const newKey = {
      key: newKeyValue.trim(),
      label: newKeyLabel.trim(),
      provider: newKeyProvider,
    };
    try {
      await addKey(newKey);
      resetForm();
      setIsModalOpen(false);
      toast.success("API key added successfully");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Invalid API key. Please check the key and try again.",
      );
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    await removeApiKey(id);
    toast.success("API key removed");
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
