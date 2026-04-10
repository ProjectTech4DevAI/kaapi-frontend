"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import {
  PROVIDERS,
  Credential,
  ProviderDef,
} from "@/app/lib/types/credentials";
import { getExistingForProvider, timeAgo } from "@/app/lib/utils";
import { Button, Field } from "@/app/components";
import ProviderSidebar from "@/app/components/settings/ProviderSidebar";

interface OnboardingCredentialsProps {
  organizationId: number;
  projectId: number;
}

function CredentialFormPanel({
  provider,
  existingCredential,
  formValues,
  isActive,
  hasChanges,
  isLoading,
  isSaving,
  isDeleting,
  onChange,
  onActiveChange,
  onSave,
  onCancel,
  onDelete,
}: {
  provider: ProviderDef;
  existingCredential: Credential | null;
  formValues: Record<string, string>;
  isActive: boolean;
  hasChanges: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onChange: (key: string, value: string) => void;
  onActiveChange: (active: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-border border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Loading credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-md">
        <h3 className="text-base font-semibold mb-0.5 text-text-primary">
          {provider.name}
        </h3>
        <p className="text-sm mb-5 text-text-secondary">
          {provider.description}
        </p>

        <div className="space-y-4">
          {/* Active toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onActiveChange(e.target.checked)}
              className="w-4 h-4 rounded accent-status-success"
            />
            <span className="text-sm text-text-primary">Active</span>
          </label>

          {provider.fields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={formValues[field.key] || ""}
              onChange={(val) => onChange(field.key, val)}
              placeholder={field.placeholder}
              type={field.type || "text"}
            />
          ))}

          {existingCredential?.updated_at && (
            <p className="text-xs text-text-secondary">
              Last updated: {timeAgo(existingCredential.updated_at)}
            </p>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <Button
              onClick={onSave}
              disabled={isSaving || isDeleting || !hasChanges}
            >
              {isSaving ? "Saving..." : existingCredential ? "Update" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSaving || isDeleting}
            >
              Cancel
            </Button>
            {existingCredential && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={isSaving || isDeleting}
                className="ml-auto"
              >
                {isDeleting ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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

  const handleSave = async () => {
    const missing = selectedProvider.fields.filter(
      (f) => !formValues[f.key]?.trim(),
    );
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }

    setIsSaving(true);
    try {
      const innerPayload: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        innerPayload[f.key] = formValues[f.key].trim();
      });

      if (existingCredential) {
        await apiFetch(credentialsUrl, apiKey, {
          method: "PATCH",
          body: JSON.stringify({
            provider: selectedProvider.credentialKey,
            is_active: isActive,
            credential: innerPayload,
          }),
        });
        toast.success(`${selectedProvider.name} credentials updated`);
      } else {
        await apiFetch(credentialsUrl, apiKey, {
          method: "PATCH",
          body: JSON.stringify({
            provider: selectedProvider.credentialKey,
            is_active: isActive,
            credential: {
              [selectedProvider.credentialKey]: innerPayload,
            },
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
