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
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import {
  PROVIDERS,
  Credential,
  ProviderDef,
} from "@/app/lib/types/credentials";
import { getExistingForProvider } from "@/app/lib/utils";
import ProviderSidebar from "@/app/components/settings/ProviderSidebar";
import CredentialForm from "@/app/components/settings/credentials/CredentialForm";
import { apiFetch } from "@/app/lib/apiClient";

export default function CredentialsPage() {
  const toast = useToast();
  const { apiKeys, isAuthenticated } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<ProviderDef>(
    PROVIDERS[0],
  );
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [existingCredential, setExistingCredential] =
    useState<Credential | null>(null);

  // Load credentials once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    loadCredentials();
  }, [isAuthenticated, apiKeys]);

  // Re-populate form when provider or credentials change
  useEffect(() => {
    const existing = getExistingForProvider(selectedProvider, credentials);
    if (existing) {
      setExistingCredential(existing);
      setIsActive(existing.is_active);
      const populated: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        populated[f.key] = existing.credential[f.key] || "";
      });
      setFormValues(populated);
    } else {
      setExistingCredential(null);
      setIsActive(true);
      const blank: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        blank[f.key] = "";
      });
      setFormValues(blank);
    }
  }, [selectedProvider, credentials]);

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data?: Credential[] } | Credential[]>(
        "/api/credentials",
        apiKeys[0]?.key ?? "",
      );
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch {
      // Silently ignore — credentials may not exist yet or auth may be cookie-only
    } finally {
      setIsLoading(false);
    }
  };

  const buildCredentialBody = (isUpdate: boolean) => {
    const innerPayload: Record<string, string> = {};
    selectedProvider.fields.forEach((f) => {
      innerPayload[f.key] = formValues[f.key].trim();
    });
    return {
      provider: selectedProvider.credentialKey,
      is_active: isActive,
      credential: isUpdate
        ? innerPayload
        : { [selectedProvider.credentialKey]: innerPayload },
    };
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.error("Please add an API key in Keystore first");
      return;
    }
    const missing = selectedProvider.fields.filter(
      (f) => !formValues[f.key]?.trim(),
    );
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      if (existingCredential) {
        await apiFetch("/api/credentials", apiKeys[0]?.key ?? "", {
          method: "PATCH",
          body: JSON.stringify(buildCredentialBody(true)),
        });
        toast.success(`${selectedProvider.name} credentials updated`);
      } else {
        await apiFetch("/api/credentials", apiKeys[0]?.key ?? "", {
          method: "POST",
          body: JSON.stringify(buildCredentialBody(false)),
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

  const handleCancel = () => {
    const existing = getExistingForProvider(selectedProvider, credentials);
    if (existing) {
      setIsActive(existing.is_active);
      const populated: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        populated[f.key] = existing.credential[f.key] || "";
      });
      setFormValues(populated);
    } else {
      const blank: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        blank[f.key] = "";
      });
      setFormValues(blank);
      setIsActive(true);
    }
  };

  const handleDelete = async () => {
    if (!existingCredential || !isAuthenticated) return;
    setIsDeleting(true);
    try {
      await apiFetch(
        `/api/credentials/${selectedProvider.credentialKey}`,
        apiKeys[0]?.key ?? "",
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
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
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
              onSelect={setSelectedProvider}
              className="w-56 border-r border-border overflow-y-auto bg-bg-secondary"
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
                  formValues={formValues}
                  isActive={isActive}
                  isLoading={isLoading}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                  onChange={handleFieldChange}
                  onActiveChange={setIsActive}
                  onSave={handleSave}
                  onCancel={handleCancel}
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
