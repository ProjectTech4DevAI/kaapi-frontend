/**
 * Prompt Editor - Version Controlled Prompt + Config Editor
 *
 * A WYSIWYG editor for managing prompts and configs with linear versioning.
 * Features: save, load, compare configs with backend persistence.
 * Uses shared useConfigs hook for caching.
 * Supports URL query params for cross-navigation from Config Library/Evaluations.
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { colors } from "@/app/lib/colors";
import { ConfigBlob, Tool } from "./types";
import { hasConfigChanges } from "./utils";
import { ConfigCreate, ConfigVersionCreate } from "@/app/lib/configTypes";
import Header from "@/app/components/prompt-editor/Header";
import HistorySidebar from "@/app/components/prompt-editor/HistorySidebar";
import PromptEditorPane from "@/app/components/prompt-editor/PromptEditorPane";
import ConfigEditorPane from "@/app/components/prompt-editor/ConfigEditorPane";
import DiffView from "@/app/components/prompt-editor/DiffView";
import { useToast } from "@/app/components/Toast";
import Loader from "@/app/components/Loader";
import { useConfigs } from "@/app/hooks/useConfigs";
import { SavedConfig } from "@/app/lib/types/configs";
import { getApiKey, invalidateConfigCache } from "@/app/lib/utils";
import { configState } from "@/app/lib/store/configStore";
import { apiFetch } from "@/app/lib/apiClient";

function PromptEditorContent() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // URL query params for cross-navigation
  const urlConfigId = searchParams.get("config");
  const urlVersion = searchParams.get("version");
  const showHistory = searchParams.get("history") === "true";
  const isNewConfig = searchParams.get("new") === "true";

  // Evaluation context to preserve (when coming from evaluations page)
  const urlDatasetId = searchParams.get("dataset");
  const urlExperimentName = searchParams.get("experiment");
  const fromEvaluations = searchParams.get("from") === "evaluations";

  // Default config for new versions
  const defaultConfig: ConfigBlob = {
    completion: {
      provider: "openai",
      type: "text",
      params: {
        model: "gpt-4o-mini",
        instructions: "",
        temperature: 0.7,
        tools: [],
      },
    },
  };

  // Use shared configs hook with caching — pageSize:0 means only 1 API call on mount
  const {
    configs: savedConfigs,
    isLoading,
    refetch: refetchConfigs,
    loadVersionsForConfig,
    loadSingleVersion,
    versionItemsMap: hookVersionItemsMap,
    allConfigMeta,
  } = useConfigs({ pageSize: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const initialLoadComplete = !isLoading;
  const editorInitialized = React.useRef(false);
  const [editorReady, setEditorReady] = useState<boolean>(!urlConfigId);

  const [stableVersionItemsMap, setStableVersionItemsMap] = useState<
    Record<string, import("@/app/lib/types/configs").ConfigVersionItems[]>
  >({});

  useEffect(() => {
    if (Object.keys(hookVersionItemsMap).length > 0) {
      setStableVersionItemsMap((prev) => ({ ...prev, ...hookVersionItemsMap }));
    }
  }, [hookVersionItemsMap]);

  const versionItemsMap = stableVersionItemsMap;

  // Current working state
  const [currentContent, setCurrentContent] = useState<string>(
    "You are a helpful AI assistant.\nYou provide clear and concise answers.\nYou are polite and professional.",
  );
  const [currentConfigBlob, setCurrentConfigBlob] =
    useState<ConfigBlob>(defaultConfig);
  const [currentConfigName, setCurrentConfigName] = useState<string>("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>(""); // Selected version ID
  const [currentConfigParentId, setCurrentConfigParentId] =
    useState<string>(""); // Parent config ID for evaluation
  const [currentConfigVersion, setCurrentConfigVersion] = useState<number>(0); // Version number for evaluation
  const [provider, setProvider] = useState<string>("openai");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [tools, setTools] = useState<Tool[]>([]);
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(
    new Set(),
  );

  // UI state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [showHistorySidebar, setShowHistorySidebar] = useState<boolean>(true); // Default open, or from URL param
  const [showConfigPane, setShowConfigPane] = useState<boolean>(true); // Config pane collapse state

  // History viewing state
  const [selectedVersion, setSelectedVersion] = useState<SavedConfig | null>(
    null,
  );
  const [compareWith, setCompareWith] = useState<SavedConfig | null>(null);

  // Populate the editor from a fully-loaded SavedConfig
  const applyConfig = React.useCallback(
    (config: SavedConfig, selectInHistory?: boolean) => {
      setCurrentContent(config.promptContent);
      setCurrentConfigBlob({
        completion: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provider: config.provider as any,
          type: config.type,
          params: {
            model: config.modelName,
            instructions: config.instructions,
            temperature: config.temperature,
            tools: config.tools || [],
          },
        },
      });
      setProvider(config.provider);
      setTemperature(config.temperature);
      setSelectedConfigId(config.id);
      setCurrentConfigName(config.name);
      setCurrentConfigParentId(config.config_id);
      setCurrentConfigVersion(config.version);
      setTools(config.tools || []);
      setExpandedConfigs((prev) =>
        prev.has(currentConfigParentId) ? prev : new Set([...prev, currentConfigParentId]),
      );
      if (selectInHistory) setSelectedVersion(config);
    },
    [],
  );

  // Load a config directly from a SavedConfig object (no savedConfigs lookup needed)
  const handleLoadConfig = React.useCallback(
    (config: SavedConfig | null) => {
      if (!config) {
        // Reset to new config
        setCurrentContent("");
        setCurrentConfigBlob(defaultConfig);
        setProvider("openai");
        setTemperature(0.7);
        setSelectedConfigId("");
        setCurrentConfigName("");
        setCurrentConfigParentId("");
        setCurrentConfigVersion(0);
        setTools([]);
        return;
      }
      // Load the lightweight version list for the history sidebar (1 call or no-op if cached)
      loadVersionsForConfig(config.config_id);
      applyConfig(config);
    },
    [applyConfig, loadVersionsForConfig],
  );

  // Initialize editor from URL params — runs once, on first load completion
  useEffect(() => {
    if (!initialLoadComplete) return;
    if (editorInitialized.current) return;
    editorInitialized.current = true;

    // If new config is requested, reset to defaults
    if (isNewConfig) {
      setCurrentContent("");
      setCurrentConfigBlob(defaultConfig);
      setProvider("openai");
      setTemperature(0.7);
      setSelectedConfigId("");
      setCurrentConfigName("");
      setCurrentConfigParentId("");
      setCurrentConfigVersion(0);
      setTools([]);
      setEditorReady(true);
      return;
    }

    if (!urlConfigId) {
      setEditorReady(true);
      return;
    }

    (async () => {
      // Load version list for history sidebar (1 call, cached on subsequent runs)
      await loadVersionsForConfig(urlConfigId);

      const items = configState.versionItemsCache[urlConfigId] ?? [];
      if (items.length === 0) {
        setEditorReady(true);
        return;
      }

      // Resolve the target version number (latest if no specific version requested)
      const versionNum = urlVersion
        ? parseInt(urlVersion)
        : items.reduce((a, b) => (b.version > a.version ? b : a)).version;

      const config = await loadSingleVersion(urlConfigId, versionNum);
      if (config) applyConfig(config, showHistory);
      setEditorReady(true);
    })();
  }, [
    initialLoadComplete,
    urlConfigId,
    urlVersion,
    showHistory,
    isNewConfig,
    loadVersionsForConfig,
    loadSingleVersion,
    applyConfig,
  ]);

  // Re-populate version items when missing (e.g. after background cache revalidation wipes versionItemsCache)
  useEffect(() => {
    if (currentConfigParentId && !versionItemsMap[currentConfigParentId]) {
      loadVersionsForConfig(currentConfigParentId);
    }
  }, [currentConfigParentId, versionItemsMap, loadVersionsForConfig]);

  // Detect unsaved changes
  useEffect(() => {
    if (!selectedConfigId) {
      // New config - always has unsaved changes until saved
      setHasUnsavedChanges(true);
      return;
    }

    const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);
    if (!selectedConfig) {
      setHasUnsavedChanges(true);
      return;
    }

    // Compare current state with selected config
    const promptChanged = currentContent !== selectedConfig.promptContent;
    const configChanged = hasConfigChanges(currentConfigBlob, {
      completion: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        provider: selectedConfig.provider as any,
        params: {
          model: selectedConfig.modelName,
          instructions: selectedConfig.instructions,
          temperature: selectedConfig.temperature,
          tools: selectedConfig.tools || [],
        },
      },
    });

    setHasUnsavedChanges(promptChanged || configChanged);
  }, [
    selectedConfigId,
    currentContent,
    currentConfigBlob,
    provider,
    temperature,
    tools,
    savedConfigs,
  ]);


  // Save current configuration
  const handleSaveConfig = async () => {
    if (!currentConfigName.trim()) {
      toast.error("Please enter a configuration name");
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      toast.error("No API key found. Please add an API key in the Keystore.");
      return;
    }

    setIsSaving(true);

    try {
      // Build config blob (store prompt in instructions field)
      // Extract tools array and flatten to direct params fields for backend compatibility
      const tools = currentConfigBlob.completion.params.tools || [];

      // Collect ALL knowledge_base_ids from ALL tools into a single array
      const allKnowledgeBaseIds: string[] = [];
      let maxNumResults = 20; // default

      tools.forEach((tool) => {
        // Add all knowledge_base_ids from this tool
        allKnowledgeBaseIds.push(...tool.knowledge_base_ids);
        // Use max_num_results from first tool (could be made configurable)
        if (allKnowledgeBaseIds.length === tool.knowledge_base_ids.length) {
          maxNumResults = tool.max_num_results;
        }
      });

      const configBlob: ConfigBlob = {
        completion: {
          provider: currentConfigBlob.completion.provider,
          type: currentConfigBlob.completion.type || "text", // Default to 'text'
          params: {
            model: currentConfigBlob.completion.params.model,
            instructions: currentContent, // Store prompt as instructions
            temperature: currentConfigBlob.completion.params.temperature,
            // Flatten tools array to direct fields for backend - support multiple knowledge bases
            ...(allKnowledgeBaseIds.length > 0 && {
              knowledge_base_ids: allKnowledgeBaseIds,
              max_num_results: maxNumResults,
            }),
          },
        },
      };

      // Check if updating existing config (same name exists) using allConfigMeta
      const existingConfigMeta = allConfigMeta.find(
        (m) => m.name === currentConfigName.trim(),
      );

      if (existingConfigMeta) {
        // Create new version for existing config
        const versionCreate: ConfigVersionCreate = {
          config_blob: configBlob,
          commit_message: commitMessage.trim() || `Updated prompt and config`,
        };

        const data = await apiFetch<{ success: boolean; error?: string }>(
          `/api/configs/${existingConfigMeta.id}/versions`,
          apiKey,
          {
            method: "POST",
            body: JSON.stringify(versionCreate),
          },
        );

        if (!data.success) {
          toast.error(
            `Failed to create version: ${data.error || "Unknown error"}`,
          );
          return;
        }

        toast.success(
          `Configuration "${currentConfigName}" updated! New version created.`,
        );
      } else {
        // Create new config
        const configCreate: ConfigCreate = {
          name: currentConfigName.trim(),
          description: `${provider} configuration with prompt`,
          config_blob: configBlob,
          commit_message: commitMessage.trim() || "Initial version",
        };

        const data = await apiFetch<{
          success: boolean;
          data?: unknown;
          error?: string;
        }>("/api/configs", apiKey, {
          method: "POST",
          body: JSON.stringify(configCreate),
        });

        if (!data.success || !data.data) {
          toast.error(
            `Failed to create config: ${data.error || "Unknown error"}`,
          );
          return;
        }

        toast.success(
          `Configuration "${currentConfigName}" created successfully!`,
        );
      }

      // Invalidate config cache and refresh from shared hook
      invalidateConfigCache();
      await refetchConfigs(true);

      // Reset unsaved changes flag and commit message after successful save
      setHasUnsavedChanges(false);
      setCommitMessage("");
    } catch (e) {
      console.error("Failed to save config:", e);
      toast.error("Failed to save configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="w-full h-screen flex flex-col"
      style={{ backgroundColor: colors.bg.secondary }}
    >
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeRoute="/configurations/prompt-editor"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            currentConfigId={currentConfigParentId}
            currentConfigVersion={currentConfigVersion}
            currentConfigName={currentConfigName}
            hasUnsavedChanges={hasUnsavedChanges}
            datasetId={urlDatasetId || undefined}
            experimentName={urlExperimentName || undefined}
            fromEvaluations={fromEvaluations}
          />

          <div className="flex flex-1 overflow-hidden">
            {!editorReady ? (
              <div
                className="flex-1 flex items-center justify-center"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="animate-spin rounded-full border-4 border-solid"
                    style={{
                      width: "36px",
                      height: "36px",
                      borderColor: colors.bg.primary,
                      borderTopColor: colors.accent.primary,
                    }}
                  />
                  <p
                    className="text-sm"
                    style={{ color: colors.text.secondary }}
                  >
                    Loading configuration...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <HistorySidebar
                  savedConfigs={savedConfigs}
                  selectedVersion={selectedVersion}
                  currentConfigId={currentConfigParentId || undefined}
                  expandedConfigs={expandedConfigs}
                  setExpandedConfigs={setExpandedConfigs}
                  collapsed={!showHistorySidebar}
                  onToggle={() => setShowHistorySidebar(!showHistorySidebar)}
                  onSelectVersion={(version) => {
                    setSelectedVersion(version);
                    setCompareWith(null);
                  }}
                  onLoadVersion={(version) => {
                    handleLoadConfig(version);
                  }}
                  onBackToEditor={() => {
                    setSelectedVersion(null);
                    setCompareWith(null);
                  }}
                  isLoading={isLoading}
                  versionItems={
                    currentConfigParentId
                      ? (versionItemsMap[currentConfigParentId] ?? [])
                      : undefined
                  }
                  onFetchVersionDetail={
                    currentConfigParentId
                      ? (version) =>
                          loadSingleVersion(currentConfigParentId, version)
                      : undefined
                  }
                  allConfigMeta={allConfigMeta}
                  fullVersionItemsMap={versionItemsMap}
                  loadVersionsForConfig={loadVersionsForConfig}
                  loadSingleVersionForConfig={loadSingleVersion}
                />

                {/* Show DiffView only when comparing versions (sidebar open + version selected) */}
                {showHistorySidebar && selectedVersion ? (
                  <DiffView
                    selectedCommit={selectedVersion}
                    compareWith={compareWith}
                    commits={savedConfigs}
                    onCompareChange={setCompareWith}
                    loadVersionsForConfig={loadVersionsForConfig}
                    versionItemsMap={versionItemsMap}
                    onFetchVersionDetail={loadSingleVersion}
                    onLoadVersion={(config) => {
                      handleLoadConfig(config);
                      setSelectedVersion(null);
                      setCompareWith(null);
                    }}
                  />
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Split View: Prompt (left) + Config (right) */}
                    <div className="flex flex-1 overflow-hidden">
                      <div
                        className="flex"
                        style={{
                          flex: "1 1 0%",
                          transition: "flex 0.2s ease-in-out",
                        }}
                      >
                        <PromptEditorPane
                          currentContent={currentContent}
                          onContentChange={setCurrentContent}
                          currentBranch={currentConfigName || "Unsaved"}
                        />
                      </div>
                      <ConfigEditorPane
                        configBlob={currentConfigBlob}
                        onConfigChange={setCurrentConfigBlob}
                        configName={currentConfigName}
                        onConfigNameChange={setCurrentConfigName}
                        savedConfigs={savedConfigs}
                        selectedConfigId={selectedConfigId}
                        onLoadConfig={handleLoadConfig}
                        allConfigMeta={allConfigMeta}
                        loadVersionsForConfig={loadVersionsForConfig}
                        versionItemsMap={versionItemsMap}
                        loadSingleVersion={loadSingleVersion}
                        commitMessage={commitMessage}
                        onCommitMessageChange={setCommitMessage}
                        onSave={handleSaveConfig}
                        isSaving={isSaving}
                        collapsed={!showConfigPane}
                        onToggle={() => setShowConfigPane(!showConfigPane)}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PromptEditorPage() {
  return (
    <Suspense fallback={<Loader size="lg" message="Loading..." fullScreen />}>
      <PromptEditorContent />
    </Suspense>
  );
}
