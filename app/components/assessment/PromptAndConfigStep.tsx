"use client";

import { Button } from "@/app/components/ui";
import { ChevronLeftIcon } from "@/app/components/icons";
import { usePromptAndConfigStep } from "@/app/hooks/usePromptAndConfigStep";
import type { PromptAndConfigStepProps } from "@/app/lib/types/assessment";
import AssessmentConfiguration from "./prompt-config/AssessmentConfiguration";
import SetupProgress from "./prompt-config/SetupProgress";
import PromptPanel from "./prompt-config/PromptPanel";
import ResponseSchema from "./prompt-config/ResponseSchema";

export default function PromptAndConfigStep(props: PromptAndConfigStepProps) {
  const {
    textColumns,
    sampleRow,
    systemInstruction,
    setSystemInstruction,
    promptTemplate,
    setPromptTemplate,
    configs,
    outputSchema,
    setOutputSchema,
    onNext,
    onBack,
  } = props;

  const {
    promptStatus,
    responseSummary,
    hasConfiguredResponseFormat,
    canProceed,
    nextBlockerMessage,
    configMode,
    setConfigMode,
    removeSelection,
    filteredConfigCards,
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
    loadConfigs,
    loadVersions,
    toggleConfigExpansion,
    toggleVersionSelection,
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
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    handleCreateAndAdd,
  } = usePromptAndConfigStep(props);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 pb-20">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Evaluation
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Write the task on the left. Tune behavior and output on the right.
            </p>
          </div>
          <SetupProgress
            promptStatus={promptStatus}
            selectedConfigCount={configs.length}
            responseSummary={responseSummary}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(330px,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(360px,1.05fr)]">
          <PromptPanel
            textColumns={textColumns}
            sampleRow={sampleRow}
            systemInstruction={systemInstruction}
            setSystemInstruction={setSystemInstruction}
            promptTemplate={promptTemplate}
            setPromptTemplate={setPromptTemplate}
          />

          <aside className="self-start space-y-5 lg:sticky lg:top-6 lg:min-w-[330px] xl:min-w-[360px]">
            <ResponseSchema
              schema={outputSchema}
              setSchema={setOutputSchema}
              summary={responseSummary}
              hasFields={hasConfiguredResponseFormat}
            />

            <AssessmentConfiguration
              configMode={configMode}
              setConfigMode={setConfigMode}
              configs={configs}
              onRemoveConfig={removeSelection}
              configCards={filteredConfigCards}
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
              onLoadMoreConfigs={(skip) => loadConfigs(skip, false)}
              onLoadVersions={(configId, skip) =>
                void loadVersions(configId, skip)
              }
              onToggleConfigExpansion={toggleConfigExpansion}
              onToggleVersionSelection={toggleVersionSelection}
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
              onProviderChange={handleProviderChange}
              onModelChange={handleModelChange}
              onParamChange={updateDraftParam}
              onSaveConfig={handleCreateAndAdd}
            />
          </aside>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 flex items-center justify-between border-t border-border bg-bg-secondary px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onBack}
            className="!rounded-lg !px-6"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {!canProceed && (
              <span className="text-xs text-text-secondary">
                {nextBlockerMessage}
              </span>
            )}
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              disabled={!canProceed}
              className="!rounded-lg !px-6"
            >
              Next: Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
