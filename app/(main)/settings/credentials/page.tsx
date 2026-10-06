/**
 * Credentials Settings Page — orchestrator
 * State management and API calls only. UI split into:
 *   ProviderSidebar  — left sidebar nav
 *   CredentialForm — right form with fields and actions
 */

"use client";

import { useState, useEffect } from "react";
import SettingsSidebar from "@/app/components/settings/SettingsSidebar";
import PageHeader from "@/app/components/PageHeader";
import { useToast } from "@/app/hooks/useToast";
import { useCredentialForm } from "@/app/hooks/useCredentialForm";
import { useAuth } from "@/app/lib/context/AuthContext";
import { PROVIDERS, Credential } from "@/app/lib/types/credentials";
import ProviderSidebar from "@/app/components/settings/ProviderSidebar";
import CredentialForm from "@/app/components/settings/credentials/CredentialForm";
import { apiFetch } from "@/app/lib/apiClient";

export default function CredentialsPage() {
  const toast = useToast();
  const { apiKeys, isAuthenticated } = useAuth();
  const apiKey = apiKeys[0]?.key ?? "";
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useCredentialForm(credentials);
  const { selectedProvider, existingCredential, isActive } = form;

  // Load credentials once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    loadCredentials();
  }, [isAuthenticated, apiKeys]);

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data?: Credential[] } | Credential[]>(
        "/api/credentials",
        apiKey,
      );
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch {
      // Silently ignore — credentials may not exist yet or auth may be cookie-only
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }
    const payload = form.validatePayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      if (existingCredential) {
        await apiFetch("/api/credentials", apiKey, {
          method: "PATCH",
          body: JSON.stringify({
            provider: selectedProvider.credentialKey,
            is_active: isActive,
            credential: payload,
          }),
        });
        toast.success(`${selectedProvider.name} credentials updated`);
      } else {
        await apiFetch("/api/credentials", apiKey, {
          method: "POST",
          body: JSON.stringify({
            provider: selectedProvider.credentialKey,
            is_active: isActive,
            credential: { [selectedProvider.credentialKey]: payload },
          }),
        });
        toast.success(`${selectedProvider.name} credentials saved`);
      }
      await loadCredentials();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save credentials",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingCredential || !isAuthenticated) return;
    setIsDeleting(true);
    try {
      await apiFetch(
        `/api/credentials/${selectedProvider.credentialKey}`,
        apiKey,
        { method: "DELETE" },
      );
      toast.success(`${selectedProvider.name} credentials removed`);
      await loadCredentials();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove credentials",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-primary">
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader
            title="Credentials"
            subtitle="Manage provider credentials"
          />

          <div className="flex flex-1 overflow-hidden">
            <ProviderSidebar
              providers={PROVIDERS}
              selectedProvider={selectedProvider}
              credentials={credentials}
              onSelect={form.setSelectedProvider}
              className="w-56 border-r border-border overflow-y-auto bg-bg-primary"
            />

            <div className="flex-1 overflow-y-auto p-8">
              {!isAuthenticated ? (
                <div className="max-w-lg rounded-lg border border-border p-6 text-sm bg-bg-primary text-text-secondary">
                  Please log in to manage credentials.
                </div>
              ) : (
                <CredentialForm
                  provider={selectedProvider}
                  existingCredential={existingCredential}
                  formValues={form.formValues}
                  isActive={isActive}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                  onChange={form.handleFieldChange}
                  onActiveChange={form.setIsActive}
                  onSave={handleSave}
                  onCancel={form.resetForm}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
