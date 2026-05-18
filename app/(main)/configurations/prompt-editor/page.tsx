/**
 * Prompt WYSIWYG Editor: Manage prompts and configs with versioning, caching,
 * and URL-based navigation support.
 */

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/app/components/Sidebar";
import { ConfigBlob, Tool } from "@/app/lib/types/promptEditor";
import { hasConfigChanges } from "@/app/lib/promptEditorUtils";
import Header from "@/app/components/prompt-editor/Header";
import HistorySidebar from "@/app/components/prompt-editor/HistorySidebar";
import PromptEditorPane from "@/app/components/prompt-editor/PromptEditorPane";
import ConfigEditorPane from "@/app/components/prompt-editor/ConfigEditorPane";
import DiffView from "@/app/components/prompt-editor/DiffView";
import { Loader } from "@/app/components/ui";
import { useApp } from "@/app/lib/context/AppContext";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useConfigs } from "@/app/hooks";
import { useConfigPersistence } from "@/app/hooks/useConfigPersistence";
import { SavedConfig, ConfigVersionItems } from "@/app/lib/types/configs";
import { configState } from "@/app/lib/store/configStore";
import { DEFAULT_CONFIG } from "@/app/lib/constants";

function PromptEditorContent() {
  const searchParams = useSearchParams();
  const { sidebarCollapsed } = useApp();
  const { activeKey } = useAuth();
  const urlConfigId = searchParams.get("config");
  const urlVersion = searchParams.get("version");
  const showHistory = searchParams.get("history") === "true";
  const isNewConfig = searchParams.get("new") === "true";
  const urlDatasetId = searchParams.get("dataset");
  const urlExperimentName = searchParams.get("experiment");
  const fromEvaluations = searchParams.get("from") === "evaluations";

  const {
    configs: savedConfigs,
    isLoading,
    refetch: refetchConfigs,
    loadVersionsForConfig,
    loadSingleVersion,
    versionItemsMap: hookVersionItemsMap,
    allConfigMeta,
  } = useConfigs({ pageSize: 0 });

  const initialLoadComplete = !isLoading;
  const editorInitialized = React.useRef(false);
  const [editorReady, setEditorReady] = useState<boolean>(!urlConfigId);
  const [stableVersionItemsMap, setStableVersionItemsMap] = useState<
    Record<string, ConfigVersionItems[]>
  >({});

  const [currentContent, setCurrentContent] = useState<string>(
    "You are a helpful AI assistant.\nYou provide clear and concise answers.\nYou are polite and professional.",
  );
  const [currentConfigBlob, setCurrentConfigBlob] =
    useState<ConfigBlob>(DEFAULT_CONFIG);
  const [currentConfigName, setCurrentConfigName] = useState<string>("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [currentConfigParentId, setCurrentConfigParentId] =
    useState<string>("");
  const [currentConfigVersion, setCurrentConfigVersion] = useState<number>(0);
  const [provider, setProvider] = useState<string>("openai");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [tools, setTools] = useState<Tool[]>([]);
  const [expandedConfigs, setExpandedConfigs] = useState<Set<string>>(
    new Set(),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<SavedConfig | null>(
    null,
  );
  const [compareWith, setCompareWith] = useState<SavedConfig | null>(null);

  const { isSaving, saveConfig, renameConfig } = useConfigPersistence({
    allConfigMeta,
    refetchConfigs,
  });

  useEffect(() => {
    if (Object.keys(hookVersionItemsMap).length > 0) {
      setStableVersionItemsMap((prev) => ({ ...prev, ...hookVersionItemsMap }));
    }
  }, [hookVersionItemsMap]);

  const versionItemsMap = stableVersionItemsMap;

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
        ...(config.input_guardrails?.length && {
          input_guardrails: config.input_guardrails,
        }),
        ...(config.output_guardrails?.length && {
          output_guardrails: config.output_guardrails,
        }),
      });
      setProvider(config.provider);
      setTemperature(config.temperature);
      setSelectedConfigId(config.id);
      setCurrentConfigName(config.name);
      setCurrentConfigParentId(config.config_id);
      setCurrentConfigVersion(config.version);
      setTools(config.tools || []);
      setExpandedConfigs((prev) =>
        prev.has(config.config_id)
          ? prev
          : new Set([...prev, config.config_id]),
      );
      if (selectInHistory) setSelectedVersion(config);
    },
    [],
  );

  const resetEditor = React.useCallback(() => {
    setCurrentContent("");
    setCurrentConfigBlob(DEFAULT_CONFIG);
    setProvider("openai");
    setTemperature(0.7);
    setSelectedConfigId("");
    setCurrentConfigName("");
    setCurrentConfigParentId("");
    setCurrentConfigVersion(0);
    setTools([]);
  }, []);

  const handleLoadConfig = React.useCallback(
    (config: SavedConfig | null) => {
      if (!config) {
        resetEditor();
        return;
      }
      loadVersionsForConfig(config.config_id);
      applyConfig(config);
    },
    [applyConfig, loadVersionsForConfig, resetEditor],
  );

  // Initialize editor from URL params — runs once
  useEffect(() => {
    if (!initialLoadComplete) return;
    if (editorInitialized.current) return;
    editorInitialized.current = true;

    if (isNewConfig) {
      resetEditor();
      setEditorReady(true);
      return;
    }

    if (!urlConfigId) {
      setEditorReady(true);
      return;
    }

    (async () => {
      await loadVersionsForConfig(urlConfigId);
      const items = configState.versionItemsCache[urlConfigId] ?? [];
      if (items.length === 0) {
        setEditorReady(true);
        return;
      }
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
    resetEditor,
  ]);

  // Re-populate version items when missing (e.g. after background cache wipe)
  useEffect(() => {
    if (currentConfigParentId && !versionItemsMap[currentConfigParentId]) {
      loadVersionsForConfig(currentConfigParentId);
    }
  }, [currentConfigParentId, versionItemsMap, loadVersionsForConfig]);

  // Track unsaved changes by diffing against the loaded config
  useEffect(() => {
    if (!selectedConfigId) {
      setHasUnsavedChanges(true);
      return;
    }
    const selectedConfig = savedConfigs.find((c) => c.id === selectedConfigId);
    if (!selectedConfig) {
      setHasUnsavedChanges(true);
      return;
    }
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

  const handleSave = async () => {
    const ok = await saveConfig({
      currentConfigName,
      currentConfigBlob,
      currentContent,
      commitMessage,
      provider,
    });
    if (ok) {
      setHasUnsavedChanges(false);
      setCommitMessage("");
    }
  };

  const handleRename = async (configId: string, newName: string) => {
    const ok = await renameConfig(configId, newName, currentConfigName);
    if (ok) setCurrentConfigName(newName.trim());
    return ok;
  };

  return (
    <div className="w-full h-screen flex flex-col bg-bg-secondary">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          activeRoute="/configurations/prompt-editor"
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
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
              <div className="flex-1 flex items-center justify-center bg-bg-secondary">
                <Loader size="md" message="Loading configuration..." />
              </div>
            ) : (
              <>
                <HistorySidebar
                  savedConfigs={savedConfigs}
                  selectedVersion={selectedVersion}
                  currentConfigId={currentConfigParentId || undefined}
                  expandedConfigs={expandedConfigs}
                  setExpandedConfigs={setExpandedConfigs}
                  onSelectVersion={(version) => {
                    setSelectedVersion(version);
                    setCompareWith(null);
                  }}
                  onLoadVersion={handleLoadConfig}
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

                {selectedVersion ? (
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
                    <div className="flex flex-1 overflow-hidden">
                      <div className="flex flex-1 min-w-0 transition-[flex] duration-200 ease-in-out">
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
                        boundConfigId={currentConfigParentId}
                        onRenameConfig={handleRename}
                        onLoadConfig={handleLoadConfig}
                        allConfigMeta={allConfigMeta}
                        loadVersionsForConfig={loadVersionsForConfig}
                        versionItemsMap={versionItemsMap}
                        loadSingleVersion={loadSingleVersion}
                        commitMessage={commitMessage}
                        onCommitMessageChange={setCommitMessage}
                        onSave={handleSave}
                        isSaving={isSaving}
                        apiKey={activeKey?.key ?? ""}
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
