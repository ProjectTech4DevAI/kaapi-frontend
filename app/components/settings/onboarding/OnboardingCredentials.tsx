"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { apiFetch } from "@/app/lib/apiClient";
import {
  PROVIDERS,
  Credential,
  ProviderDef,
} from "@/app/lib/types/credentials";
import {
  buildCredentialPayload,
  getExistingForProvider,
  missingCredentialFields,
  populateCredentialForm,
} from "@/app/lib/utils";
import ProviderSidebar from "@/app/components/settings/ProviderSidebar";
import { CredentialFormPanel } from "@/app/components/settings/credentials";

interface OnboardingCredentialsProps {
  organizationId: number;
  projectId: number;
}

export default function OnboardingCredentials({
  organizationId,
  projectId,
}: OnboardingCredentialsProps) {
  const toast = useToast();
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [selectedProvider, setSelectedProvider] = useState<ProviderDef>(
    PROVIDERS[0],
  );
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [existingCredential, setExistingCredential] =
    useState<Credential | null>(null);

  const credentialsUrl = `/api/credentials/org/${organizationId}/${projectId}`;

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data?: Credential[] } | Credential[]>(
        `/api/credentials/org/${organizationId}/${projectId}`,
        apiKey,
      );
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, organizationId, projectId]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  // Re-populate form when provider or credentials change
  useEffect(() => {
    const existing = getExistingForProvider(selectedProvider, credentials);
    setExistingCredential(existing);
    setIsActive(existing ? existing.is_active : true);
    setFormValues(populateCredentialForm(selectedProvider, existing));
  }, [selectedProvider, credentials]);

  const handleSave = async () => {
    const missing = missingCredentialFields(selectedProvider, formValues);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    const built = buildCredentialPayload(selectedProvider, formValues);
    if (built.error) {
      toast.error(built.error);
      return;
    }
    if (Object.keys(built.payload).length === 0) {
      toast.error("No changes to save");
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch(credentialsUrl, apiKey, {
        method: "PATCH",
        body: JSON.stringify({
          provider: selectedProvider.credentialKey,
          is_active: isActive,
          credential: {
            [selectedProvider.credentialKey]: built.payload,
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

  const handleCancel = () => {
    const existing = getExistingForProvider(selectedProvider, credentials);
    setIsActive(existing ? existing.is_active : true);
    setFormValues(populateCredentialForm(selectedProvider, existing));
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

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="flex gap-8 mt-4">
        <ProviderSidebar
          providers={PROVIDERS}
          selectedProvider={selectedProvider}
          credentials={credentials}
          onSelect={setSelectedProvider}
          className="w-44"
        />

        <CredentialFormPanel
          provider={selectedProvider}
          existingCredential={existingCredential}
          formValues={formValues}
          isActive={isActive}
          hasChanges={
            existingCredential
              ? isActive !== existingCredential.is_active ||
                selectedProvider.fields.some(
                  (f) =>
                    (formValues[f.key] || "") !==
                    (existingCredential.credential[f.key] || ""),
                )
              : selectedProvider.fields.some((f) => !!formValues[f.key]?.trim())
          }
          isLoading={isLoading}
          isSaving={isSaving}
          isDeleting={isDeleting}
          onChange={handleFieldChange}
          onActiveChange={setIsActive}
          onSave={handleSave}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
