// Assessment types: the 4-step wizard — flows, steps, and the hook contract.
import type { AssessorVersionDetail } from "./dataSource";
import type { UseWizardDraftResult } from "./prompt";

/** The two persistent surfaces: Home, or the wizard. */
export type AssessmentView = "home" | "wizard";

export type AssessmentWizardFlow = "new" | "edit" | "run";
export type AssessmentWizardStep = 1 | 2 | 3 | 4;

/** The assessor version a wizard run is anchored to (absent in the `new` flow). */
export interface WizardContext {
  configId: string;
  version: number;
  assessorName: string;
}

export interface UseAssessmentWizardResult {
  flow: AssessmentWizardFlow;
  step: AssessmentWizardStep;
  completedSteps: Set<number>;
  context: WizardContext | null;
  versionDetail: AssessorVersionDetail | null;
  isLoadingContext: boolean;
  draft: UseWizardDraftResult;

  submissionId: string;
  submissionName: string;

  runName: string;
  setRunName: (value: string) => void;
  isSubmitting: boolean;

  /** True when the draft differs from the version it was loaded from. */
  isDirty: boolean;
  /** Whether Review & save is allowed: a real diff, or content for a new assessor. */
  canSave: boolean;
  isSaving: boolean;
  isReviewOpen: boolean;
  savedTitle: string | null;
  openReview: () => void;
  closeReview: () => void;
  saveVersion: (name: string, commitMessage: string) => Promise<void>;
  dismissSaved: (next: "run" | "home") => void;

  startNew: () => void;
  startEdit: (context: WizardContext) => void;
  startRun: (context: WizardContext) => void;
  goToStep: (step: number) => void;
  next: () => void;
  back: () => void;
  submitRun: () => Promise<void>;
}
