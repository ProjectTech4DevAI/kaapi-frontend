/** Footer labels and the strip's context line — pure, so the view stays markup. */
import { wizardEntryStep } from "@/app/lib/assessment/wizard";
import type {
  AssessmentWizardStep,
  UseAssessmentWizardResult,
} from "@/app/lib/types/assessment";

interface FooterState {
  showBack: boolean;
  hint: string;
  nextLabel: string;
  nextDisabled: boolean;
}

interface FooterInput {
  wizard: UseAssessmentWizardResult;
  hasSubmission: boolean;
  rowCount: number | null;
  /** A file is sitting in step 4's upload form, not yet created. */
  hasPendingUpload: boolean;
}

const NEXT_LABELS: Record<AssessmentWizardStep, string> = {
  1: "Next: Pre-filter",
  2: "Next: Assessment",
  3: "Review & save",
  4: "Run assessment",
};

const STEP_HINTS: Record<AssessmentWizardStep, string> = {
  1: "",
  2: "Pre-filter is optional — toggle it off to skip",
  3: "",
  4: "",
};

export function wizardFooterState({
  wizard,
  hasSubmission,
  rowCount,
  hasPendingUpload,
}: FooterInput): FooterState {
  const { step, flow, submissionName } = wizard;
  // The entry step has no Back — the round home button is the way out.
  const showBack = step !== wizardEntryStep(flow);

  if (step === 1) {
    return {
      showBack,
      hint: hasSubmission
        ? `Selected: ${submissionName}`
        : "Select or upload a submission set",
      nextLabel: NEXT_LABELS[1],
      nextDisabled: !hasSubmission,
    };
  }

  if (step === 3) {
    return { showBack, ...assessmentStepFooter(wizard) };
  }

  if (step !== 4) {
    return {
      showBack,
      hint: STEP_HINTS[step],
      nextLabel: NEXT_LABELS[step],
      nextDisabled: false,
    };
  }

  return {
    showBack,
    hint: runStepHint({
      hasVersion: Boolean(wizard.context),
      hasSubmission,
      rowCount,
      hasPendingUpload,
    }),
    nextLabel: NEXT_LABELS[4],
    nextDisabled: !hasSubmission || !wizard.context || hasPendingUpload,
  };
}

/**
 * Step 3 is the save gate. A brand-new assessor needs content; an existing one
 * needs a real diff. In the run flow an untouched draft just moves on, and any
 * edit turns the action into a version bump.
 */
function assessmentStepFooter(
  wizard: UseAssessmentWizardResult,
): Omit<FooterState, "showBack"> {
  const { flow, canSave, isDirty } = wizard;

  if (flow === "run") {
    return isDirty
      ? {
          hint: "Saving bumps a new version — the run uses it",
          nextLabel: "Review & save",
          nextDisabled: false,
        }
      : {
          hint: "Unchanged — runs the selected version",
          nextLabel: "Next: Run assessment",
          nextDisabled: false,
        };
  }

  const hint = canSave
    ? "Saving creates a new assessor version"
    : flow === "edit"
      ? "No changes yet — edit something to save a new version"
      : "Write the assessment prompt to enable Review & save";

  return { hint, nextLabel: NEXT_LABELS[3], nextDisabled: !canSave };
}

function runStepHint({
  hasVersion,
  hasSubmission,
  rowCount,
  hasPendingUpload,
}: Omit<FooterInput, "wizard"> & { hasVersion: boolean }): string {
  if (hasPendingUpload) {
    return "Create the uploaded submission first, or cancel it";
  }
  if (!hasVersion) return "Save the assessor first to run it";
  if (!hasSubmission) return "Select a submission set";
  if (rowCount === null) return "Every row of the set will be queued";
  return `${rowCount} row${rowCount === 1 ? "" : "s"} will be queued`;
}

export function wizardContextLabel(wizard: UseAssessmentWizardResult): string {
  const { flow, context } = wizard;
  if (flow === "new") return "New assessor";
  if (!context) return "";
  return flow === "edit"
    ? `Editing ${context.assessorName} · from v${context.version}`
    : `${context.assessorName} v${context.version}`;
}
