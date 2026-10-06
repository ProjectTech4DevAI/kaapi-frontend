"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { useCredentialForm } from "@/app/hooks/useCredentialForm";
import { apiFetch } from "@/app/lib/apiClient";
import {
  PROVIDERS,
  type Credential,
  type OnboardingCredentialsProps,
} from "@/app/lib/types/credentials";
import ProviderSidebar from "@/app/components/settings/ProviderSidebar";
import { CredentialFormPanel } from "@/app/components/settings/credentials";

export default function OnboardingCredentials({
  organizationId,
  projectId,
}: OnboardingCredentialsProps) {
  const toast = useToast();
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useCredentialForm(credentials);
  const { selectedProvider, existingCredential, isActive } = form;

  const credentialsUrl = `/api/credentials/org/${organizationId}/${projectId}`;

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data?: Credential[] } | Credential[]>(
        credentialsUrl,
        apiKey,
      );
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, credentialsUrl]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleSave = async () => {
    const payload = form.validatePayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      await apiFetch(credentialsUrl, apiKey, {
        method: "PATCH",
        body: JSON.stringify({
          provider: selectedProvider.credentialKey,
          is_active: isActive,
          credential: {
            [selectedProvider.credentialKey]: payload,
          },
        }),
      });
      toast.success(
        `${selectedProvider.name} credentials ${existingCredential ? "updated" : "saved"}`,
      );
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
    if (!existingCredential) return;
    setIsDeleting(true);
    try {
      await apiFetch(
        `${credentialsUrl}/provider/${selectedProvider.credentialKey}`,
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
    <div>
      <div className="flex gap-8 mt-4">
        <ProviderSidebar
          providers={PROVIDERS}
          selectedProvider={selectedProvider}
          credentials={credentials}
          onSelect={form.setSelectedProvider}
          className="w-44"
        />

        <CredentialFormPanel
          provider={selectedProvider}
          existingCredential={existingCredential}
          formValues={form.formValues}
          isActive={isActive}
          hasChanges={form.hasChanges}
          isLoading={isLoading}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onChange={form.handleFieldChange}
          onActiveChange={form.setIsActive}
          onSave={handleSave}
          onCancel={form.resetForm}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
