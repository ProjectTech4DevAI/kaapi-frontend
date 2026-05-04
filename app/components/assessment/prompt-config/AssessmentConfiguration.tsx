"use client";

import {
  MAX_CONFIGS,
  type AssessmentConfigurationProps,
} from "@/app/lib/types/assessment";
import ConfigCreator from "./ConfigCreator";
import SavedConfigs from "./SavedConfigs";
import SelectedConfigs from "./SelectedConfigs";

export default function AssessmentConfiguration({
  configMode,
  setConfigMode,
  configs,
  onRemoveConfig,
  configCards,
  searchQuery,
  setSearchQuery,
  isLoadingConfigs,
  hasMoreConfigs,
  nextConfigSkip,
  expandedConfigId,
  versionStateByConfig,
  loadingSelectionKeys,
  isSelected,
  onLoadMoreConfigs,
  onLoadVersions,
  onToggleConfigExpansion,
  onToggleVersionSelection,
  currentProvider,
  currentModel,
  providerModels,
  currentParamDefs,
  draftParams,
  configName,
  commitMessage,
  isSaving,
  setConfigName,
  setCommitMessage,
  onProviderChange,
  onModelChange,
  onParamChange,
  onSaveConfig,
}: AssessmentConfigurationProps) {
  const modeToggleClass = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
      active
        ? "bg-accent-primary text-white"
        : "bg-transparent text-text-secondary"
    }`;

  return (
    <details open className="rounded-2xl border border-border bg-bg-primary">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            AI Configuration
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            {configs.length > 0
              ? `${configs.length} selected`
              : "Choose at least one configuration"}
          </div>
        </div>
        {configs.length > 0 && configs.length < MAX_CONFIGS && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setConfigMode("existing");
            }}
            className="min-w-[64px] cursor-pointer rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary"
          >
            Add more
          </button>
        )}
      </summary>

      {configs.length > 0 && (
        <div className="border-t border-border px-4 py-4">
          <SelectedConfigs configs={configs} onRemove={onRemoveConfig} />
        </div>
      )}

      <div className="border-t border-border px-4 py-4">
        <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
          <button
            onClick={() => setConfigMode("existing")}
            className={modeToggleClass(configMode === "existing")}
          >
            Saved
          </button>
          <button
            onClick={() => setConfigMode("create")}
            className={modeToggleClass(configMode === "create")}
          >
            New
          </button>
        </div>

        {configMode === "existing" && (
          <SavedConfigs
            configCards={configCards}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoadingConfigs={isLoadingConfigs}
            hasMoreConfigs={hasMoreConfigs}
            nextConfigSkip={nextConfigSkip}
            expandedConfigId={expandedConfigId}
            versionStateByConfig={versionStateByConfig}
            loadingSelectionKeys={loadingSelectionKeys}
            isSelected={isSelected}
            onLoadMoreConfigs={onLoadMoreConfigs}
            onLoadVersions={onLoadVersions}
            onToggleConfigExpansion={onToggleConfigExpansion}
            onToggleVersionSelection={onToggleVersionSelection}
          />
        )}

        {configMode === "create" && (
          <ConfigCreator
            currentProvider={currentProvider}
            currentModel={currentModel}
            providerModels={providerModels}
            currentParamDefs={currentParamDefs}
            draftParams={draftParams}
            configName={configName}
            commitMessage={commitMessage}
            isSaving={isSaving}
            setConfigName={setConfigName}
            setCommitMessage={setCommitMessage}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            onParamChange={onParamChange}
            onSave={onSaveConfig}
          />
        )}
      </div>
    </details>
  );
}
