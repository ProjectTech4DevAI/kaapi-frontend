"use client";

import { ASSESSMENT_CONFIG_STEPS } from "@/app/lib/assessment/constants";
import type { ConfigPanelProps } from "@/app/lib/types/assessment";
import AssessmentSection from "./config-editor/AssessmentSection";
import PrefilterSection from "./config-editor/PrefilterSection";
import ConfigSelectStep from "./ConfigSelectStep";
import Stepper from "./Stepper";

// Config authoring flow: 1 Choose config -> 2 Pre-filter (optional) ->
// 3 Assessment (ends in Review & save). Steps stay mounted (hidden via CSS)
// so in-flight edits survive navigation.
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
          <PrefilterSection
            prefilterConfig={editorState.prefilterConfig}
            setPrefilterConfig={editorState.setPrefilterConfig}
            onNext={() => onStepComplete(2)}
            onBack={() => setConfigStep(1)}
            syncToken={editorState.configSeed?.nonce}
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
          />
        </div>
      </div>
    </>
  );
}
