"use client";

import { Button } from "@/app/components";
import { DatabaseIcon } from "@/app/components/icons";
import { ASSESSMENT_CONFIG_STEPS } from "@/app/lib/assessment/constants";
import type { ConfigPanelProps } from "@/app/lib/types/assessment";
import ColumnMapperStep from "./ColumnMapperStep";
import PromptAndConfigStep from "./PromptAndConfigStep";
import ReviewStep from "./ReviewStep";
import Stepper from "./Stepper";

export default function ConfigPanel({
  apiKey,
  canSubmitAssessment,
  columns,
  columnMapping,
  completedSteps,
  configStep,
  configs,
  experimentName,
  formState,
  hasDataset,
  isSubmitting,
  outputSchema,
  outputSchemaJson,
  systemInstruction,
  promptTemplate,
  sampleRow,
  setActiveTabToDatasets,
  setColumnMapping,
  setConfigStep,
  setConfigs,
  setExperimentName,
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
          <DatabaseIcon className="mx-auto mb-4 h-12 w-12 text-neutral-200" />
          <p className="mb-1 text-sm font-medium text-neutral-900">
            No dataset selected
          </p>
          <p className="mb-4 text-xs text-neutral-500">
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
          <PromptAndConfigStep
            apiKey={apiKey}
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
            onNext={() => onStepComplete(2)}
            onBack={() => setConfigStep(1)}
          />
        </div>
        <div
          className={
            configStep === 3 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <ReviewStep
            formState={formState}
            experimentName={experimentName}
            setExperimentName={setExperimentName}
            isSubmitting={isSubmitting}
            canSubmit={canSubmitAssessment}
            outputSchemaJson={outputSchemaJson}
            submitBlockerMessage={submitBlockerMessage}
            onSubmit={onSubmit}
            onBack={() => setConfigStep(2)}
            onEditStep={setConfigStep}
          />
        </div>
      </div>
    </>
  );
}
