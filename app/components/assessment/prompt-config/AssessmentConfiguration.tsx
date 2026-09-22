"use client";

import type { AssessmentConfigurationProps } from "@/app/lib/types/assessment";
import ConfigCreator from "./ConfigCreator";

export default function AssessmentConfiguration({
  currentProvider,
  currentModel,
  providerModels,
  currentParamDefs,
  draftParams,
  configName,
  commitMessage,
  isSaving,
  isSaveModalOpen,
  setIsSaveModalOpen,
  saveMode,
  setSaveMode,
  versionConfigId,
  setVersionConfigId,
  existingConfigs,
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
            Model Selection
          </div>
          <div className="mt-1 text-xs text-text-secondary">
            Choose the provider and model this configuration runs on.
          </div>
        </div>
      </summary>

      <div className="border-t border-border px-4 py-4">
        <ConfigCreator
          currentProvider={currentProvider}
          currentModel={currentModel}
          providerModels={providerModels}
          currentParamDefs={currentParamDefs}
          draftParams={draftParams}
          configName={configName}
          commitMessage={commitMessage}
          isSaving={isSaving}
          isSaveModalOpen={isSaveModalOpen}
          setIsSaveModalOpen={setIsSaveModalOpen}
          saveMode={saveMode}
          setSaveMode={setSaveMode}
          versionConfigId={versionConfigId}
          setVersionConfigId={setVersionConfigId}
          existingConfigs={existingConfigs}
          setConfigName={setConfigName}
          setCommitMessage={setCommitMessage}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          onParamChange={onParamChange}
          onSave={onSaveConfig}
        />
      </div>
    </details>
  );
}
