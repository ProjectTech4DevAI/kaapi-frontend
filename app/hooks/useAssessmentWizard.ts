"use client";

/**
 * The 4-step assessment wizard: which flow is running, which step is open, and the
 * run it ends with. Step 1 owns submission state (useSubmissionStep); this hook only
 * needs the selected set, which it reads from the assessment store.
 */
import { useCallback, useMemo, useState } from "react";
import { useAssessorVersionContext } from "@/app/hooks/useAssessorVersionContext";
import { useRunNameDraft } from "@/app/hooks/useRunNameDraft";
import { useWizardDraft } from "@/app/hooks/useWizardDraft";
import { useVersionSaveFlow } from "@/app/hooks/useVersionSaveFlow";
import { useRunSubmit } from "@/app/hooks/useRunSubmit";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import {
  isWizardStepAllowed,
  wizardEntryStep,
  wizardOpenSteps,
} from "@/app/lib/assessment/wizard";
import type {
  AssessmentWizardFlow,
  AssessorVersionDetail,
  AssessmentWizardStep,
  UseAssessmentWizardResult,
  WizardContext,
} from "@/app/lib/types/assessment";

interface UseAssessmentWizardParams {
  onExit: () => void;
  onRunCreated: (context: WizardContext) => void;
}

export function useAssessmentWizard({
  onExit,
  onRunCreated,
}: UseAssessmentWizardParams): UseAssessmentWizardResult {
  const version = useAssessorVersionContext();
  const draft = useWizardDraft();

  const submissionId = useAssessmentDatasetStore((state) => state.datasetId);
  const submissionName = useAssessmentDatasetStore(
    (state) => state.datasetName,
  );
  const submissionColumns = useAssessmentDatasetStore((state) => state.columns);
  const clearDataset = useAssessmentDatasetStore((state) => state.clearDataset);

  const [flow, setFlow] = useState<AssessmentWizardFlow>("new");
  const [step, setStep] = useState<AssessmentWizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [context, setContext] = useState<WizardContext | null>(null);
  const { runName, setRunName } = useRunNameDraft(context, step === 4);

  // A saved version becomes the wizard's context, and the flow continues as a run.
  const onSaved = useCallback(
    (next: WizardContext, detail: AssessorVersionDetail) => {
      setContext(next);
      setFlow("run");
      setCompletedSteps(new Set([1, 2, 3]));
      version.adopt(detail);
    },
    [version],
  );

  const saveFlow = useVersionSaveFlow({
    draft: draft.draft,
    submissionId,
    submissionColumns,
    context,
    onSaved,
  });

  const { isSubmitting, submitRun } = useRunSubmit({
    context,
    submissionId,
    runName,
    onRunCreated,
  });

  const start = useCallback(
    (nextFlow: AssessmentWizardFlow, nextContext: WizardContext | null) => {
      const entry = wizardEntryStep(nextFlow);
      setFlow(nextFlow);
      setContext(nextContext);
      setStep(entry);
      setCompletedSteps(
        new Set(wizardOpenSteps(nextFlow).filter((open) => open < entry)),
      );
      if (nextContext) {
        version.load(nextContext, (detail) => {
          draft.loadFromVersion(detail);
          saveFlow.rebaseline(detail);
        });
      } else {
        version.reset();
        draft.reset();
        clearDataset();
        saveFlow.rebaseline(null);
      }
    },
    [clearDataset, draft, saveFlow, version],
  );

  const starters = useMemo(
    () => ({
      startNew: () => start("new", null),
      startEdit: (nextContext: WizardContext) => start("edit", nextContext),
      startRun: (nextContext: WizardContext) => start("run", nextContext),
    }),
    [start],
  );

  const goToStep = useCallback(
    (nextStep: number) => {
      const allowed = isWizardStepAllowed({
        flow,
        step: nextStep,
        currentStep: step,
        completedSteps,
      });
      if (allowed) setStep(nextStep as AssessmentWizardStep);
    },
    [completedSteps, flow, step],
  );

  const next = useCallback(() => {
    const open = wizardOpenSteps(flow);
    setCompletedSteps((current) => new Set(current).add(step));
    const following = open[open.indexOf(step) + 1];
    if (following) setStep(following);
  }, [flow, step]);

  const back = useCallback(() => {
    const open = wizardOpenSteps(flow);
    const index = open.indexOf(step);
    if (index <= 0) onExit();
    else setStep(open[index - 1]);
  }, [flow, onExit, step]);

  const dismissSaved = useCallback(
    (next: "run" | "home") => {
      saveFlow.dismissSaved();
      if (next === "run") setStep(4);
      else onExit();
    },
    [onExit, saveFlow],
  );

  return {
    flow,
    step,
    completedSteps,
    context,
    versionDetail: version.versionDetail,
    isLoadingContext: version.isLoading,
    draft,
    submissionId,
    submissionName,
    runName,
    setRunName,
    isSubmitting,
    isDirty: saveFlow.isDirty,
    canSave: saveFlow.canSave,
    isSaving: saveFlow.isSaving,
    isReviewOpen: saveFlow.isReviewOpen,
    savedTitle: saveFlow.savedTitle,
    openReview: saveFlow.openReview,
    closeReview: saveFlow.closeReview,
    saveVersion: saveFlow.saveVersion,
    dismissSaved,
    ...starters,
    goToStep,
    next,
    back,
    submitRun,
  };
}
