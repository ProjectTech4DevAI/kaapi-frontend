/**
 * Guardrails — 2-panel layout:
 * [LEFT: Config Form] | [RIGHT: Saved Configs List]
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/app/components/Sidebar";
import { colors } from "@/app/lib/colors";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import PageHeader from "@/app/components/PageHeader";
import {
  Validator,
  SavedValidatorConfig,
  formatValidatorName,
} from "@/app/components/guardrails/types";
import ValidatorConfigPanel from "@/app/components/guardrails/ValidatorConfigPanel";
import { TrashIcon } from "@/app/components/icons";
import validatorMeta from "@/app/components/guardrails/validators.json";

interface OrgContext {
  organization_id: number;
  project_id: number;
}

interface ValidatorMeta {
  validator_type: string;
  validator_name: string;
  description: string;
}

const metaMap: Record<string, ValidatorMeta> = (
  validatorMeta as ValidatorMeta[]
).reduce((acc, v) => ({ ...acc, [v.validator_type]: v }), {});

export default function GuardrailsPage() {
  const { sidebarCollapsed } = useApp();
  const { activeKey, isHydrated } = useAuth();
  const toast = useToast();

  // Org/project context from API key verification
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);

  // Available validators from API
  const [validators, setValidators] = useState<Validator[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(true);

  // Saved configs from API
  const [savedConfigs, setSavedConfigs] = useState<SavedValidatorConfig[]>([]);
  const [savedConfigsLoading, setSavedConfigsLoading] = useState(true);

  // Form state
  const [selectedValidatorType, setSelectedValidatorType] = useState<
    string | null
  >(null);
  const [selectedSavedConfig, setSelectedSavedConfig] =
    useState<SavedValidatorConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: verify API key → get org/project IDs
  useEffect(() => {
    if (!isHydrated) return;
    if (!activeKey?.key) {
      toast.error(
        "No API key found. Please add your Kaapi API key in the Keystore.",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiFetch<any>("/api/apikeys/verify", activeKey.key)
      .then((data) => {
        const org_id = data?.data?.organization_id;
        const proj_id = data?.data?.project_id;
        if (org_id != null && proj_id != null) {
          setOrgContext({ organization_id: org_id, project_id: proj_id });
        } else {
          toast.error("Could not determine organization/project from API key");
        }
      })
      .catch((e: Error) =>
        toast.error(
          e.message ||
            "API key verification failed — check your key in the Keystore",
        ),
      );
  }, [isHydrated, activeKey?.key]);

  // Step 2: fetch available validators (no auth needed for catalog)
  useEffect(() => {
    setValidatorsLoading(true);
    fetch("/api/guardrails")
      .then((r) => r.json())
      .then((data) => {
        const list: Validator[] = Array.isArray(data?.validators)
          ? data.validators
          : [];
        setValidators(list);
      })
      .catch(() => toast.error("Failed to load validators"))
      .finally(() => setValidatorsLoading(false));
  }, []);

  // Step 3: fetch saved configs once we have org/project context
  const configsQueryString = orgContext
    ? `?organization_id=${parseInt(String(orgContext.organization_id), 10)}&project_id=${parseInt(String(orgContext.project_id), 10)}`
    : null;

  const fetchSavedConfigs = useCallback(() => {
    if (!configsQueryString) return;
    setSavedConfigsLoading(true);
    fetch(`/api/guardrails/validators/configs${configsQueryString}`)
      .then((r) => r.json())
      .then((data) => {
        const list: SavedValidatorConfig[] = Array.isArray(data?.data?.configs)
          ? data.data.configs
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.configs)
              ? data.configs
              : Array.isArray(data)
                ? data
                : [];
        setSavedConfigs(list);
      })
      .catch(() => toast.error("Failed to load saved configs"))
      .finally(() => setSavedConfigsLoading(false));
  }, [configsQueryString]);

  useEffect(() => {
    fetchSavedConfigs();
  }, [fetchSavedConfigs]);

  // Load a saved config into the form
  const handleSelectSavedConfig = (cfg: SavedValidatorConfig) => {
    setSelectedSavedConfig(cfg);
    setSelectedValidatorType(cfg.type);
  };

  // Reset the form
  const handleClearForm = () => {
    setSelectedValidatorType(null);
    setSelectedSavedConfig(null);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!configsQueryString) return;
    try {
      const res = await fetch(
        `/api/guardrails/validators/configs/${configId}${configsQueryString}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Config deleted");
      if (selectedSavedConfig?.id === configId) {
        handleClearForm();
      }
      fetchSavedConfigs();
    } catch {
      toast.error("Failed to delete config");
    }
  };

  const handleSaveConfig = async (
    name: string,
    configValues: Record<string, unknown>,
  ) => {
    if (!name.trim()) {
      toast.error("Please enter a config name");
      return;
    }
    if (!configsQueryString) {
      toast.error("API key not verified yet");
      return;
    }
    setIsSaving(true);
    try {
      const isUpdate = !!selectedSavedConfig;
      const url = isUpdate
        ? `/api/guardrails/validators/configs/${selectedSavedConfig!.id}${configsQueryString}`
        : `/api/guardrails/validators/configs${configsQueryString}`;

      // PATCH only accepts these five fields — strip everything else
      const body = isUpdate
        ? {
            name: configValues.name,
            type: configValues.type,
            stage: configValues.stage,
            on_fail_action: configValues.on_fail_action,
            is_enabled: configValues.is_enabled,
          }
        : configValues;

      const res = await fetch(url, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err?.error ?? (isUpdate ? "Update failed" : "Save failed"),
        );
      }
      toast.success(
        isUpdate ? `Config "${name}" updated` : `Config "${name}" saved`,
      );
      fetchSavedConfigs();
      setSelectedSavedConfig(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  const existingValues = selectedSavedConfig
    ? {
        ...(selectedSavedConfig.config ?? {}),
        stage: selectedSavedConfig.stage,
        on_fail_action: selectedSavedConfig.on_fail_action,
        is_enabled: selectedSavedConfig.is_enabled,
      }
    : null;

  return (
    <div
      className="w-full h-screen flex"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <Sidebar collapsed={sidebarCollapsed} activeRoute="/guardrails" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <PageHeader
          title="Guardrails"
          subtitle="Configure validators for safe and reliable AI"
        />

        {/* 2-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Config form panel */}
          <div
            className="flex-shrink-0 border-r overflow-hidden"
            style={{ width: "420px", borderColor: colors.border }}
          >
            <ValidatorConfigPanel
              validators={validators}
              validatorsLoading={validatorsLoading}
              selectedType={selectedValidatorType}
              onTypeChange={setSelectedValidatorType}
              existingValues={existingValues}
              existingName={selectedSavedConfig?.name}
              isSaving={isSaving}
              apiKey={activeKey?.key ?? ""}
              onSave={handleSaveConfig}
              onClear={handleClearForm}
            />
          </div>

          {/* RIGHT: Saved configs list */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <SavedConfigsList
              configs={savedConfigs}
              isLoading={savedConfigsLoading}
              selectedConfigId={selectedSavedConfig?.id ?? null}
              onSelectConfig={handleSelectSavedConfig}
              onDeleteConfig={handleDeleteConfig}
              onNewConfig={handleClearForm}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Saved Configs List Panel ────────────────────────────────────────────────

interface SavedConfigsListProps {
  configs: SavedValidatorConfig[];
  isLoading: boolean;
  selectedConfigId: string | null;
  onSelectConfig: (cfg: SavedValidatorConfig) => void;
  onDeleteConfig: (id: string) => void;
  onNewConfig: () => void;
}

function SavedConfigsList({
  configs,
  isLoading,
  selectedConfigId,
  onSelectConfig,
  onDeleteConfig,
  onNewConfig,
}: SavedConfigsListProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{
          backgroundColor: colors.bg.primary,
          borderColor: colors.border,
        }}
      >
        <div>
          <div
            className="text-sm font-semibold"
            style={{ color: colors.text.primary }}
          >
            Saved Configurations
          </div>
          {!isLoading && (
            <div className="text-xs" style={{ color: colors.text.secondary }}>
              {configs.length} config{configs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <button
          onClick={onNewConfig}
          className="text-sm px-3 py-1.5 rounded-md font-medium transition-colors"
          style={{ backgroundColor: colors.accent.primary, color: "#ffffff" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = colors.accent.hover)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = colors.accent.primary)
          }
        >
          + New Config
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto p-5">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-lg animate-pulse border"
                style={{
                  backgroundColor: colors.bg.secondary,
                  borderColor: colors.border,
                }}
              />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg py-16 text-center"
            style={{ borderColor: colors.border }}
          >
            <svg
              className="w-10 h-10 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: colors.border }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <p
              className="text-sm font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              No saved configurations yet
            </p>
            <p className="text-xs" style={{ color: colors.text.secondary }}>
              Select a validator type on the left and save your first config
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((cfg) => {
              const isSelected = selectedConfigId === cfg.id;
              const displayName =
                metaMap[cfg.type]?.validator_name ??
                formatValidatorName(cfg.type);
              return (
                <div
                  key={cfg.id}
                  className="rounded-xl border shadow-sm cursor-pointer transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: colors.bg.primary,
                    borderColor: colors.border,
                    borderLeftWidth: "4px",
                    borderLeftColor: isSelected
                      ? colors.status.success
                      : "#d97706",
                  }}
                  onClick={() => onSelectConfig(cfg)}
                >
                  <div className="flex items-center gap-3 px-4 py-4">
                    {/* Text + badges */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold mb-2 truncate"
                        style={{ color: colors.text.primary }}
                      >
                        {cfg.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-md border"
                          style={{
                            color: colors.text.secondary,
                            borderColor: colors.border,
                            backgroundColor: colors.bg.secondary,
                          }}
                        >
                          {displayName}
                        </span>
                        {cfg.stage && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md border"
                            style={{
                              color: colors.text.secondary,
                              borderColor: colors.border,
                              backgroundColor: colors.bg.secondary,
                            }}
                          >
                            {cfg.stage}
                          </span>
                        )}
                        {cfg.on_fail_action && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-md border"
                            style={{
                              color: colors.text.secondary,
                              borderColor: colors.border,
                              backgroundColor: colors.bg.secondary,
                            }}
                          >
                            on fail: {cfg.on_fail_action}
                          </span>
                        )}
                        {cfg.is_enabled === false && (
                          <span className="text-[11px] px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700">
                            disabled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectConfig(cfg);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium"
                        style={{
                          borderColor: colors.border,
                          color: colors.text.primary,
                          backgroundColor: colors.bg.secondary,
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#e5e5e5")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            colors.bg.secondary)
                        }
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConfig(cfg.id);
                        }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium"
                        style={{
                          borderColor: "#fecaca",
                          color: colors.status.error,
                          backgroundColor: "#fff5f5",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = "#fee2e2")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = "#fff5f5")
                        }
                      >
                        <TrashIcon className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
