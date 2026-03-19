/**
 * Credentials Settings Page — orchestrator
 * State management and API calls only. UI split into:
 *   ProviderList  — left sidebar nav
 *   CredentialForm — right form with fields and actions
 */

"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/app/components/Sidebar";
import { colors } from "@/app/lib/colors";
import { useToast } from "@/app/components/Toast";
import { APIKey, STORAGE_KEY } from "@/app/keystore/page";
import {
  PROVIDERS,
  Credential,
  ProviderDef,
} from "@/app/lib/types/credentials";
import { getExistingForProvider } from "@/app/lib/utils";
import ProviderList from "@/app/components/settings/credentials/ProviderList";
import CredentialForm from "@/app/components/settings/credentials/CredentialForm";
import { apiFetch } from "@/app/lib/apiClient";
import Link from "next/link";

export default function CredentialsPage() {
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ProviderDef>(
    PROVIDERS[0],
  );
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [existingCredential, setExistingCredential] =
    useState<Credential | null>(null);

  // Load API keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setApiKeys(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Load credentials once we have an API key
  useEffect(() => {
    if (apiKeys.length === 0) return;
    loadCredentials();
  }, [apiKeys]);

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
    setVisibleFields(new Set());
  }, [selectedProvider, credentials]);

  const loadCredentials = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ data?: Credential[] } | Credential[]>(
        "/api/credentials",
        apiKeys[0].key,
      );
      setCredentials(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to load credentials:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (apiKeys.length === 0) {
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
      const credentialPayload: Record<string, string> = {};
      selectedProvider.fields.forEach((f) => {
        credentialPayload[f.key] = formValues[f.key].trim();
      });

      const body = {
        provider: selectedProvider.credentialKey,
        is_active: isActive,
        credential: credentialPayload,
      };

      if (existingCredential) {
        await apiFetch("/api/credentials", apiKeys[0].key, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success(`${selectedProvider.name} credentials updated`);
      } else {
        await apiFetch("/api/credentials", apiKeys[0].key, {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success(`${selectedProvider.name} credentials saved`);
      }
      await loadCredentials();
    } catch (err: any) {
      toast.error(err.message || "Failed to save credentials");
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
    setVisibleFields(new Set());
  };

  const handleDelete = async () => {
    if (!existingCredential || apiKeys.length === 0) return;
    setIsDeleting(true);
    try {
      await apiFetch(
        `/api/credentials/${selectedProvider.credentialKey}`,
        apiKeys[0].key,
        { method: "DELETE" },
      );
      toast.success(`${selectedProvider.name} credentials removed`);
      await loadCredentials();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove credentials");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleVisibility = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeRoute="/settings/credentials"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="border-b px-4 py-3 flex items-center justify-between shrink-0"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
            }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 rounded-md"
                style={{ color: colors.text.secondary }}
                aria-label="Toggle sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <h1
                  className="text-base font-semibold"
                  style={{
                    color: colors.text.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Settings
                </h1>
                <p className="text-xs" style={{ color: colors.text.secondary }}>
                  Manage provider credentials
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <ProviderList
              providers={PROVIDERS}
              selectedProvider={selectedProvider}
              credentials={credentials}
              onSelect={setSelectedProvider}
            />

            <div className="flex-1 overflow-y-auto p-8">
              {apiKeys.length === 0 ? (
                <div
                  className="max-w-lg rounded-lg border p-6 text-sm"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: colors.bg.primary,
                    color: colors.text.secondary,
                  }}
                >
                  No API key found. Please add one in{" "}
                  <Link
                    href="/keystore"
                    className="underline"
                    style={{ color: colors.text.primary }}
                  >
                    Keystore
                  </Link>{" "}
                  first.
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
                  visibleFields={visibleFields}
                  onChange={handleFieldChange}
                  onActiveChange={setIsActive}
                  onToggleVisibility={handleToggleVisibility}
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
