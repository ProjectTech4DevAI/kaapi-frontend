"use client";

import { RadioGroup } from "@/app/components/ui";
import type { AssessmentConfigurationProps } from "@/app/lib/types/assessment";
import type { ConfigMode } from "@/app/lib/types/assessment/config";
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
  latestModelByConfig,
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
      </summary>

      {configs.length > 0 && (
        <div className="border-t border-border px-4 py-4">
          <SelectedConfigs configs={configs} onRemove={onRemoveConfig} />
        </div>
      )}

      <div className="border-t border-border px-4 py-4">
        <div className="mb-4">
          <RadioGroup<ConfigMode>
            value={configMode}
            onChange={setConfigMode}
            ariaLabel="Config source"
            options={[
              { value: "existing", label: "Saved" },
              { value: "create", label: "New" },
            ]}
          />
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
            latestModelByConfig={latestModelByConfig}
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
