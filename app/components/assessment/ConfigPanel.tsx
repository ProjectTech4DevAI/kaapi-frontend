"use client";

import { ASSESSMENT_CONFIG_STEPS } from "@/app/lib/assessment/constants";
import { useReferenceDataset } from "@/app/hooks/useReferenceDataset";
import type { ConfigPanelProps } from "@/app/lib/types/assessment";
import AssessmentSection from "./config-editor/AssessmentSection";
import PrefilterSection from "./config-editor/PrefilterSection";
import ReferenceDatasetPicker from "./config-editor/ReferenceDatasetPicker";
import ConfigSelectStep from "./ConfigSelectStep";
import Stepper from "./Stepper";

// Config authoring flow: 1 Choose config -> 2 Pre-filter (optional) ->
// 3 Assessment (ends in Review & save). Steps stay mounted (hidden via CSS)
// so in-flight edits survive navigation. The reference dataset is shared by
// the Pre-filter and Assessment editors (@-mention columns + sample row).
export default function ConfigPanel({
  completedSteps,
  configStep,
  setConfigStep,
  onStepComplete,
  onStartNewConfig,
  onLoadExistingConfig,
  onForbidden,
  ...editorState
}: ConfigPanelProps) {
  const reference = useReferenceDataset();

  return (
    <>
      <Stepper
        steps={ASSESSMENT_CONFIG_STEPS}
        currentStep={configStep}
        onStepClick={setConfigStep}
        completedSteps={completedSteps}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 pt-6">
        {configStep !== 1 && (
          <div className="mx-auto mb-5 w-full max-w-7xl">
            <ReferenceDatasetPicker
              datasets={reference.datasets}
              isLoadingDatasets={reference.isLoadingDatasets}
              referenceDataset={reference.referenceDataset}
              isLoadingReference={reference.isLoadingReference}
              onSelect={(id) => void reference.selectReferenceDataset(id)}
            />
          </div>
        )}

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
          <PrefilterSection
            prefilterConfig={editorState.prefilterConfig}
            setPrefilterConfig={editorState.setPrefilterConfig}
            columnMapping={editorState.columnMapping}
            setColumnMapping={editorState.setColumnMapping}
            onNext={() => onStepComplete(2)}
            onBack={() => setConfigStep(1)}
            syncToken={editorState.configSeed?.nonce}
            reference={reference}
          />
        </div>

        <div
          className={
            configStep === 3 ? "flex min-h-0 h-full flex-1 flex-col" : "hidden"
          }
        >
          <AssessmentSection
            {...editorState}
            onBack={() => setConfigStep(2)}
            onSaved={() => onStepComplete(3)}
            reference={reference}
          />
        </div>
      </div>
    </>
  );
}
