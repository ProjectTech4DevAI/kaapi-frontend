"use client";

import { Button } from "@/app/components";
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              setConfigMode("existing");
            }}
            className="!min-w-[64px] !rounded-lg !px-3 !py-1.5 !text-xs !font-semibold"
          >
            Add more
          </Button>
        )}
      </summary>

      {configs.length > 0 && (
        <div className="border-t border-border px-4 py-4">
          <SelectedConfigs configs={configs} onRemove={onRemoveConfig} />
        </div>
      )}

      <div className="border-t border-border px-4 py-4">
        <div className="mb-4 inline-flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
          <Button
            type="button"
            variant={configMode === "existing" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setConfigMode("existing")}
            className="!rounded-lg !px-3 !py-1.5 !text-xs"
          >
            Saved
          </Button>
          <Button
            type="button"
            variant={configMode === "create" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setConfigMode("create")}
            className="!rounded-lg !px-3 !py-1.5 !text-xs"
          >
            New
          </Button>
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
