/**
 * Guardrails — 2-panel layout:
 * [LEFT: Config Form] | [RIGHT: Saved Configs List]
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/app/components/Sidebar";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import PageHeader from "@/app/components/PageHeader";
import {
  Validator,
  SavedValidatorConfig,
  OrgContext,
} from "@/app/lib/types/guardrails";
import ValidatorConfigPanel from "@/app/components/guardrails/ValidatorConfigPanel";
import SavedConfigsList from "@/app/components/guardrails/SavedConfigsList";

export default function GuardrailsPage() {
  const { sidebarCollapsed } = useApp();
  const { isHydrated, activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const toast = useToast();
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [validators, setValidators] = useState<Validator[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(true);
  const [savedConfigs, setSavedConfigs] = useState<SavedValidatorConfig[]>([]);
  const [savedConfigsLoading, setSavedConfigsLoading] = useState(true);
  const [selectedValidatorType, setSelectedValidatorType] = useState<
    string | null
  >(null);
  const [selectedSavedConfig, setSelectedSavedConfig] =
    useState<SavedValidatorConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    guardrailsFetch<{ data?: { organization_id: number; project_id: number } }>(
      "/api/apikeys/verify", //need to change this in backend to /auth/verify
      apiKey,
    )
      .then((data) => {
        const org_id = data?.data?.organization_id;
        const proj_id = data?.data?.project_id;
        if (org_id != null && proj_id != null) {
          setOrgContext({ organization_id: org_id, project_id: proj_id });
        } else {
          toast.error("Could not determine organization/project from session");
        }
      })
      .catch((e: Error) =>
        toast.error(e.message || "Session verification failed"),
      );
  }, [isHydrated, apiKey]);

  useEffect(() => {
    setValidatorsLoading(true);
    guardrailsFetch<{ validators?: Validator[] }>("/api/guardrails", apiKey)
      .then((data) => {
        const list: Validator[] = Array.isArray(data?.validators)
          ? data.validators
          : [];
        setValidators(list);
      })
      .catch(() => toast.error("Failed to load validators"))
      .finally(() => setValidatorsLoading(false));
  }, [apiKey]);

  const configsQueryString = orgContext
    ? `?organization_id=${parseInt(String(orgContext.organization_id), 10)}&project_id=${parseInt(String(orgContext.project_id), 10)}`
    : null;

  const fetchSavedConfigs = useCallback(() => {
    if (!configsQueryString) return;
    setSavedConfigsLoading(true);
    guardrailsFetch<{
      data?: { configs?: SavedValidatorConfig[] } | SavedValidatorConfig[];
      configs?: SavedValidatorConfig[];
    }>(`/api/guardrails/validators/configs${configsQueryString}`, apiKey)
      .then((data) => {
        const nested = data?.data;
        const list: SavedValidatorConfig[] = Array.isArray(
          (nested as { configs?: SavedValidatorConfig[] })?.configs,
        )
          ? (nested as { configs: SavedValidatorConfig[] }).configs
          : Array.isArray(nested)
            ? (nested as SavedValidatorConfig[])
            : Array.isArray(data?.configs)
              ? data.configs!
              : [];
        setSavedConfigs(list);
      })
      .catch(() => toast.error("Failed to load saved configs"))
      .finally(() => setSavedConfigsLoading(false));
  }, [configsQueryString, apiKey]);

  useEffect(() => {
    fetchSavedConfigs();
  }, [fetchSavedConfigs]);

  const handleSelectSavedConfig = (cfg: SavedValidatorConfig) => {
    setSelectedSavedConfig(cfg);
    setSelectedValidatorType(cfg.type);
  };

  const handleClearForm = () => {
    setSelectedValidatorType(null);
    setSelectedSavedConfig(null);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!configsQueryString) return;
    try {
      await guardrailsFetch(
        `/api/guardrails/validators/configs/${configId}${configsQueryString}`,
        apiKey,
        { method: "DELETE" },
      );
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
      const base = `/api/guardrails/validators/configs`;
      const url = isUpdate
        ? `${base}/${selectedSavedConfig!.id}${configsQueryString}`
        : `${base}${configsQueryString}`;

      const body = configValues;

      await guardrailsFetch(url, apiKey, {
        method: isUpdate ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
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
    ? (() => {
        const {
          id: _id,
          name: _name,
          type: _type,
          config: _config,
          created_at: _ca,
          updated_at: _ua,
          organization_id: _oid,
          project_id: _pid,
          ...rest
        } = selectedSavedConfig as SavedValidatorConfig &
          Record<string, unknown>;
        return rest;
      })()
    : null;

  return (
    <div className="w-full h-screen flex bg-bg-secondary">
      <Sidebar collapsed={sidebarCollapsed} activeRoute="/guardrails" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Guardrails"
          subtitle="Configure validators for safe and reliable AI"
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="shrink-0 border-r border-border overflow-hidden w-[450px]">
            <ValidatorConfigPanel
              validators={validators}
              validatorsLoading={validatorsLoading}
              selectedType={selectedValidatorType}
              onTypeChange={setSelectedValidatorType}
              existingValues={existingValues}
              existingName={selectedSavedConfig?.name}
              isSaving={isSaving}
              onSave={handleSaveConfig}
              onClear={handleClearForm}
            />
          </div>

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
