"use client";

import { ASSESSMENT_CONFIG_STEPS } from "@/app/lib/assessment/constants";
import type { ConfigPanelProps } from "@/app/lib/types/assessment";
import ColumnMapperStep from "./ColumnMapperStep";
import ConfigSelectStep from "./ConfigSelectStep";
import PrefilterStep from "./PrefilterStep";
import PromptAndConfigStep from "./PromptAndConfigStep";
import Stepper from "./Stepper";

export default function ConfigPanel({
  columnMapping,
  completedSteps,
  configStep,
  configs,
  prefilterConfig,
  outputSchema,
  systemInstruction,
  promptTemplate,
  setColumnMapping,
  setConfigStep,
  setConfigs,
  setPrefilterConfig,
  setOutputSchema,
  setSystemInstruction,
  setPromptTemplate,
  onStepComplete,
  configSeed,
  onStartNewConfig,
  onLoadExistingConfig,
  onForbidden,
}: ConfigPanelProps) {
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
          <ConfigSelectStep
            onStartNew={onStartNewConfig}
            onLoadExisting={onLoadExistingConfig}
            onForbidden={onForbidden}
            onNext={() => onStepComplete(1)}
          />
        </div>

        <div
          className={
            configStep === 2 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <ColumnMapperStep
            columnMapping={columnMapping}
            setColumnMapping={setColumnMapping}
            onNext={() => onStepComplete(2)}
            syncToken={configSeed?.nonce}
          />
        </div>

        <div
          className={
            configStep === 3 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <PrefilterStep
            columns={columnMapping.textColumns}
            attachmentColumns={columnMapping.attachments.map((a) => a.column)}
            prefilterConfig={prefilterConfig}
            setPrefilterConfig={setPrefilterConfig}
            onNext={() => onStepComplete(3)}
            onBack={() => setConfigStep(2)}
            syncToken={configSeed?.nonce}
          />
        </div>

        <div
          className={
            configStep === 4 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <PromptAndConfigStep
            textColumns={columnMapping.textColumns}
            systemInstruction={systemInstruction}
            setSystemInstruction={setSystemInstruction}
            promptTemplate={promptTemplate}
            setPromptTemplate={setPromptTemplate}
            configs={configs}
            setConfigs={setConfigs}
            outputSchema={outputSchema}
            setOutputSchema={setOutputSchema}
            columnMapping={columnMapping}
            prefilterConfig={prefilterConfig}
            configSeed={configSeed}
            onNext={() => onStepComplete(4)}
            onBack={() => setConfigStep(3)}
          />
        </div>
      </div>
    </>
  );
}
