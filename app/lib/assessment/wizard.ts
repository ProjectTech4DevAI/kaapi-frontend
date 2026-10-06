import type {
  AssessmentWizardFlow,
  AssessmentWizardStep,
  PromptStepId,
  Step,
  WizardStepState,
} from "@/app/lib/types/assessment";

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
}): WizardStepState {
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

export function stepPillClasses(state: WizardStepState): string {
  if (state.isActive) {
    return "border-accent-primary! bg-accent-primary! text-white!";
  }
  if (state.isCompleted) return "bg-bg-secondary! text-text-primary!";
  return "bg-transparent! text-text-secondary!";
}
