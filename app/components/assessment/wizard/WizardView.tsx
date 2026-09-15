"use client";

import Stepper from "@/app/components/assessment/Stepper";
import ModelChip from "@/app/components/assessment/model/ModelChip";
import { ASSESSMENT_WIZARD_STEPS } from "@/app/lib/assessment/constants";
import {
  isWizardStepAllowed,
  promptStepFor,
} from "@/app/lib/assessment/wizard";
import { useSubmissionStep } from "@/app/hooks/useSubmissionStep";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import ReviewSaveModal from "./ReviewSaveModal";
import SavedNextModal from "./SavedNextModal";
import WizardFooter from "./WizardFooter";
import WizardStepBody from "./WizardStepBody";
import { wizardFooterState, wizardContextLabel } from "./wizardCopy";
import type { UseAssessmentWizardResult } from "@/app/lib/types/assessment";

interface WizardViewProps {
  wizard: UseAssessmentWizardResult;
  onHome: () => void;
}

/** Step 4 runs; step 3 saves — except an untouched run flow, which moves on. */
function runPrimaryAction(wizard: UseAssessmentWizardResult): void {
  if (wizard.step === 4) {
    void wizard.submitRun();
    return;
  }
  if (wizard.step === 3 && (wizard.flow !== "run" || wizard.isDirty)) {
    wizard.openReview();
    return;
  }
  wizard.next();
}

export default function WizardView({ wizard, onHome }: WizardViewProps) {
  const submission = useSubmissionStep();
  const columns = useAssessmentDatasetStore((state) => state.columns);
  const sampleRow = useAssessmentDatasetStore((state) => state.sampleRow);
  const draft = wizard.draft;
  const promptStep = promptStepFor(wizard.step);
  const selectedSubmission = submission.submissions.find(
    (item) => item.submission_id === wizard.submissionId,
  );
  const footer = wizardFooterState(
    wizard,
    Boolean(wizard.submissionId),
    selectedSubmission?.total_items ?? null,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Stepper
        steps={ASSESSMENT_WIZARD_STEPS}
        currentStep={wizard.step}
        completedSteps={wizard.completedSteps}
        onStepClick={wizard.goToStep}
        onHome={onHome}
        isStepAllowed={(candidate) =>
          isWizardStepAllowed({
            flow: wizard.flow,
            step: candidate,
            currentStep: wizard.step,
            completedSteps: wizard.completedSteps,
          })
        }
        trailing={
          <>
            <span className="truncate text-xs text-text-secondary">
              {wizardContextLabel(wizard)}
            </span>
            {promptStep && (
              <ModelChip
                step={promptStep}
                selection={draft.draft.models[promptStep]}
                onModel={draft.setModel}
                onParam={draft.setModelParam}
              />
            )}
          </>
        }
      />

      <WizardStepBody
        wizard={wizard}
        submission={submission}
        columns={columns}
        sampleRow={sampleRow}
      />

      <WizardFooter
        showBack={footer.showBack}
        hint={footer.hint}
        nextLabel={footer.nextLabel}
        nextDisabled={footer.nextDisabled}
        isBusy={wizard.isSubmitting}
        onBack={wizard.back}
        onNext={() => runPrimaryAction(wizard)}
      />

      <ReviewSaveModal
        open={wizard.isReviewOpen}
        draft={draft.draft}
        sampleRow={sampleRow}
        defaultName={wizard.context?.assessorName ?? ""}
        isSaving={wizard.isSaving}
        onClose={wizard.closeReview}
        onSave={wizard.saveVersion}
      />

      <SavedNextModal
        open={wizard.savedTitle !== null}
        title={wizard.savedTitle ?? ""}
        onRun={() => wizard.dismissSaved("run")}
        onHome={() => wizard.dismissSaved("home")}
      />
    </div>
  );
}
