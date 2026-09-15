"use client";

import SubmissionStep from "./SubmissionStep";
import PrefilterStep from "./PrefilterStep";
import AssessmentStep from "./AssessmentStep";
import RunStep from "./RunStep";
import type { WizardStepBodyProps } from "@/app/lib/types/assessment";

/** Renders whichever step is open. Kept apart so WizardView stays a shell. */
export default function WizardStepBody({
  wizard,
  submission,
  columns,
  sampleRow,
}: WizardStepBodyProps) {
  const { draft } = wizard;

  if (wizard.step === 1) return <SubmissionStep step={submission} />;

  if (wizard.step === 2) {
    return (
      <PrefilterStep
        enabled={draft.draft.prefilterEnabled}
        zones={draft.draft.prefilter}
        columns={columns}
        fieldTypes={draft.draft.fieldTypes}
        fieldStrict={draft.draft.fieldStrict}
        sampleRow={sampleRow}
        onToggle={draft.setPrefilterEnabled}
        onZoneChange={(zone, value) => draft.setZone("prefilter", zone, value)}
        onFieldType={draft.setFieldType}
        onFieldStrict={draft.setFieldStrict}
      />
    );
  }

  if (wizard.step === 3) {
    return (
      <AssessmentStep
        zones={draft.draft.assessment}
        columns={columns}
        fieldTypes={draft.draft.fieldTypes}
        fieldStrict={draft.draft.fieldStrict}
        sampleRow={sampleRow}
        outputSchema={draft.draft.outputSchema}
        onZoneChange={(zone, value) => draft.setZone("assessment", zone, value)}
        onFieldType={draft.setFieldType}
        onFieldStrict={draft.setFieldStrict}
        onOutputSchema={draft.setOutputSchema}
      />
    );
  }

  return <RunStep wizard={wizard} step={submission} />;
}
