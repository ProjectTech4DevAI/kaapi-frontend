"use client";

// Multi-step wizard (Mapper → Eliminatory → Evaluation → Post Processing → Review)
import { Button } from "@/app/components";
import { DatabaseIcon } from "@/app/components/icons";
import { ASSESSMENT_CONFIG_STEPS } from "@/app/lib/assessment/constants";
import type { ConfigPanelProps } from "@/app/lib/types/assessment";
import ColumnMapperStep from "./ColumnMapperStep";
import L1FiltersStep from "./L1FiltersStep";
import PostProcessingStep from "./PostProcessingStep";
import PromptAndConfigStep from "./PromptAndConfigStep";
import ReviewStep from "./ReviewStep";
import Stepper from "./Stepper";

export default function ConfigPanel({
  canSubmitAssessment,
  columns,
  columnMapping,
  completedSteps,
  configStep,
  configs,
  datasetId,
  experimentName,
  formState,
  hasDataset,
  isSubmitting,
  l1Config,
  outputSchema,
  systemInstruction,
  promptTemplate,
  postProcessingConfig,
  setPostProcessingConfig,
  sampleRow,
  setActiveTabToDatasets,
  setColumnMapping,
  setConfigStep,
  setConfigs,
  setExperimentName,
  setL1Config,
  setOutputSchema,
  setSystemInstruction,
  setPromptTemplate,
  submitBlockerMessage,
  onSubmit,
  onStepComplete,
}: ConfigPanelProps) {
  if (!hasDataset) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <DatabaseIcon className="mx-auto mb-4 h-12 w-12 text-border" />
          <p className="mb-1 text-sm font-medium text-text-primary">
            No dataset selected
          </p>
          <p className="mb-4 text-xs text-text-secondary">
            Select a dataset first from the Datasets tab
          </p>
          <Button
            type="button"
            onClick={setActiveTabToDatasets}
            className="!rounded-md"
          >
            Go to Datasets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Stepper
        steps={ASSESSMENT_CONFIG_STEPS}
        currentStep={configStep}
        onStepClick={setConfigStep}
        completedSteps={completedSteps}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 pt-6">
        <div
          className={
            configStep === 1 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <ColumnMapperStep
            columns={columns}
            columnMapping={columnMapping}
            setColumnMapping={setColumnMapping}
            onNext={() => onStepComplete(1)}
            onBack={setActiveTabToDatasets}
          />
        </div>

        <div
          className={
            configStep === 2 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <L1FiltersStep
            key={datasetId ?? "no-dataset"}
            columns={columnMapping.textColumns}
            attachmentColumns={columnMapping.attachments.map((a) => a.column)}
            l1Config={l1Config}
            setL1Config={setL1Config}
            onNext={() => onStepComplete(2)}
            onBack={() => setConfigStep(1)}
          />
        </div>

        <div
          className={
            configStep === 3 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <PromptAndConfigStep
            textColumns={columnMapping.textColumns}
            sampleRow={sampleRow}
            systemInstruction={systemInstruction}
            setSystemInstruction={setSystemInstruction}
            promptTemplate={promptTemplate}
            setPromptTemplate={setPromptTemplate}
            configs={configs}
            setConfigs={setConfigs}
            outputSchema={outputSchema}
            setOutputSchema={setOutputSchema}
            onNext={() => onStepComplete(3)}
            onBack={() => setConfigStep(2)}
          />
        </div>

        <div
          className={
            configStep === 4 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <PostProcessingStep
            postProcessingConfig={postProcessingConfig}
            setPostProcessingConfig={setPostProcessingConfig}
            columnMapping={columnMapping}
            outputSchema={outputSchema}
            onNext={() => onStepComplete(4)}
            onBack={() => setConfigStep(3)}
          />
        </div>

        <div
          className={
            configStep === 5 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <ReviewStep
            formState={formState}
            experimentName={experimentName}
            setExperimentName={setExperimentName}
            isSubmitting={isSubmitting}
            canSubmit={canSubmitAssessment}
            submitBlockerMessage={submitBlockerMessage}
            onSubmit={onSubmit}
            onBack={() => setConfigStep(4)}
            onEditStep={setConfigStep}
          />
        </div>
      </div>
    </>
  );
}
