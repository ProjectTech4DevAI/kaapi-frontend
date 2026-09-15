/** Pure step + flow rules for the assessment wizard. No React, no network. */
import type {
  AssessmentWizardFlow,
  AssessmentWizardStep,
  PromptStepId,
  Step,
} from "@/app/lib/types/assessment";

export interface StepState {
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
}

/**
 * Which steps each flow opens, and where it starts:
 * `new` walks 1→4 in order, `edit` reworks 1–3 from the pre-filter,
 * `run` lands on the run step with 2–3 open for tweaks.
 */
const FLOW_OPEN_STEPS: Record<AssessmentWizardFlow, AssessmentWizardStep[]> = {
  new: [1, 2, 3, 4],
  edit: [1, 2, 3],
  run: [2, 3, 4],
};

const FLOW_ENTRY_STEP: Record<AssessmentWizardFlow, AssessmentWizardStep> = {
  new: 1,
  edit: 2,
  run: 4,
};

export function wizardOpenSteps(
  flow: AssessmentWizardFlow,
): AssessmentWizardStep[] {
  return FLOW_OPEN_STEPS[flow];
}

export function wizardEntryStep(
  flow: AssessmentWizardFlow,
): AssessmentWizardStep {
  return FLOW_ENTRY_STEP[flow];
}

/** Steps 2 and 3 are the prompt steps; each carries its own model. */
export function promptStepFor(step: number): PromptStepId | null {
  if (step === 2) return "prefilter";
  if (step === 3) return "assessment";
  return null;
}

export function isWizardStepAllowed(params: {
  flow: AssessmentWizardFlow;
  step: number;
  currentStep: number;
  completedSteps: Set<number>;
}): boolean {
  const { flow, step, currentStep, completedSteps } = params;
  const open = wizardOpenSteps(flow);
  if (!open.includes(step as AssessmentWizardStep)) return false;
  if (flow !== "new") return true;

  // New assessors walk forward: a later step opens once every earlier one is done.
  return (
    step <= currentStep ||
    open
      .filter((candidate) => candidate < step)
      .every((candidate) => completedSteps.has(candidate))
  );
}

export function getStepState(params: {
  step: Step;
  steps: Step[];
  currentStep: number;
  completedSteps: Set<number>;
  locked: boolean;
  isStepAllowed?: (step: number) => boolean;
}): StepState {
  const { step, steps, currentStep, completedSteps, locked, isStepAllowed } =
    params;
  if (locked) {
    return { isActive: false, isCompleted: false, isClickable: false };
  }

  const isCompleted = completedSteps.has(step.id);
  const isUnlockedAhead =
    step.id > currentStep &&
    steps.filter((s) => s.id < step.id).every((s) => completedSteps.has(s.id));

  return {
    isActive: currentStep === step.id,
    isCompleted,
    isClickable: isStepAllowed
      ? isStepAllowed(step.id)
      : isCompleted || step.id <= currentStep || isUnlockedAhead,
  };
}

export function stepPillClasses(state: StepState): string {
  if (state.isActive) {
    return "border-accent-primary! bg-accent-primary! text-white!";
  }
  if (state.isCompleted) return "bg-bg-secondary! text-text-primary!";
  return "bg-transparent! text-text-secondary!";
}
