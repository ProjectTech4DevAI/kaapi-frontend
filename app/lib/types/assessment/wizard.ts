import type { ReactNode } from "react";
import type { Step, ValueSetter } from "./core";
import type { SchemaProperty } from "./dataset";
import type { AssessorVersionDetail } from "./dataSource";
import type {
  PromptFieldType,
  PromptZoneId,
  PromptZones,
  UseWizardDraftResult,
  WizardDraft,
} from "./prompt";
import type { UseSubmissionStepResult } from "./submission";

export type AssessmentView = "home" | "wizard";

export type AssessmentWizardFlow = "new" | "edit" | "run";
export type AssessmentWizardStep = 1 | 2 | 3 | 4;

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

  isDirty: boolean;
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

export interface WizardViewProps {
  wizard: UseAssessmentWizardResult;
  onHome: () => void;
}

export interface WizardStepBodyProps {
  wizard: UseAssessmentWizardResult;
  submission: UseSubmissionStepResult;
  columns: string[];
  sampleRow: Record<string, string>;
}

export interface WizardFooterProps {
  showBack: boolean;
  hint: string;
  nextLabel: string;
  nextDisabled: boolean;
  isBusy: boolean;
  onBack: () => void;
  onNext: () => void;
}

export interface SubmissionStepProps {
  step: UseSubmissionStepResult;
}

export interface PrefilterStepProps {
  enabled: boolean;
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  sampleRow: Record<string, string>;
  onToggle: (enabled: boolean) => void;
  onZoneChange: (zone: PromptZoneId, value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
}

export interface AssessmentStepProps {
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  sampleRow: Record<string, string>;
  outputSchema: SchemaProperty[];
  onZoneChange: (zone: PromptZoneId, value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
  onOutputSchema: (schema: SchemaProperty[]) => void;
}

export interface RunStepProps {
  wizard: UseAssessmentWizardResult;
  step: UseSubmissionStepResult;
}

export interface ReviewSaveModalProps {
  open: boolean;
  draft: WizardDraft;
  sampleRow: Record<string, string>;
  defaultName: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string, commitMessage: string) => void;
}

export interface SavedNextModalProps {
  open: boolean;
  title: string;
  onRun: () => void;
  onHome: () => void;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick: ValueSetter<number>;
  completedSteps: Set<number>;
  locked?: boolean;
  isStepAllowed?: (step: number) => boolean;
  onHome?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}
