import type { ReactNode } from "react";
import type {
  SchemaProperty,
  Step,
  StepNavigationProps,
  ColumnMapping,
  UseSubmissionStepResult,
  ValueSetter,
} from "./core";
import type { AssessorVersionDetail } from "./assessor";
import type {
  PromptFieldType,
  PromptZoneId,
  PromptZones,
  UseWizardDraftResult,
  WizardDraft,
} from "./prompt";
import type { AssessorSelection, PostProcessingConfig } from "./runs";

export type AssessmentView = "home" | "wizard";

export type AssessmentWizardFlow = "new" | "edit" | "run";
export type AssessmentWizardStep = 1 | 2 | 3 | 4;

export interface WizardContext {
  configId: string;
  version: number;
  assessorName: string;
}

export interface WizardStepState {
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
}

export interface UseAssessmentWizardParams {
  onExit: () => void;
  onRunCreated: (context: WizardContext) => void;
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

export interface UseVersionSaveFlowParams {
  draft: WizardDraft;
  submissionId: string;
  submissionColumns: string[];
  context: WizardContext | null;
  onSaved: (context: WizardContext, detail: AssessorVersionDetail) => void;
}

export interface UseVersionSaveFlowResult {
  isDirty: boolean;
  canSave: boolean;
  isSaving: boolean;
  isReviewOpen: boolean;
  savedTitle: string | null;
  openReview: () => void;
  closeReview: () => void;
  saveVersion: (name: string, commitMessage: string) => Promise<void>;
  dismissSaved: () => void;
  rebaseline: (detail: AssessorVersionDetail | null) => void;
}

export interface UseRunSubmitParams {
  context: WizardContext | null;
  submissionId: string;
  runName: string;
  onRunCreated: (context: WizardContext) => void;
}

export interface UseRunSubmitResult {
  isSubmitting: boolean;
  submitRun: () => Promise<void>;
}

export interface UseRunNameDraftResult {
  runName: string;
  setRunName: (value: string) => void;
}

export interface WizardFooterState {
  showBack: boolean;
  hint: string;
  nextLabel: string;
  nextDisabled: boolean;
}

export interface WizardFooterInput {
  wizard: UseAssessmentWizardResult;
  hasSubmission: boolean;
  rowCount: number | null;
  hasPendingUpload: boolean;
}

export interface RunPreviewState {
  isLoading: boolean;
  isDisabled: boolean;
  rows: string[][];
}

export interface PageLayoutProps {
  view: AssessmentView;
  wizard: UseAssessmentWizardResult;
  homeSelection: AssessorSelection | null;
  onGoHome: () => void;
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

export interface PostProcessingStepProps extends StepNavigationProps {
  postProcessingConfig: PostProcessingConfig | null;
  setPostProcessingConfig: (config: PostProcessingConfig | null) => void;
  columnMapping: ColumnMapping;
  outputSchema: SchemaProperty[];
}

export interface PostProcessingPanelProps {
  availableColumns: string[];
  fetchColumns?: () => Promise<string[]>;
  initialConfig: PostProcessingConfig | null;
  onSave: (config: PostProcessingConfig) => Promise<void>;
}
