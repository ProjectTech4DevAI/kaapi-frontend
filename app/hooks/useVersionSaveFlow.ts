"use client";

/**
 * The save half of the wizard: whether the draft differs from the version it was
 * loaded from, the Review & save dialog, and what happens after a save.
 *
 * The baseline is derived from the loaded version's own detail rather than from
 * whatever the draft happens to hold at that moment — the draft and the linked
 * submission set arrive in separate renders, and comparing against a
 * half-applied draft would report a phantom diff.
 */
import { useCallback, useMemo, useState } from "react";
import { useAssessorSave } from "@/app/hooks/useAssessorSave";
import {
  draftFromVersion,
  emptyDraft,
  hasAssessmentContent,
  serializeDraft,
} from "@/app/lib/assessment/draft";
import type {
  AssessorVersionDetail,
  WizardContext,
  WizardDraft,
} from "@/app/lib/types/assessment";

interface UseVersionSaveFlowParams {
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
  /** Called when a flow starts, so the diff is measured from the right place. */
  rebaseline: (detail: AssessorVersionDetail | null) => void;
}

function baselineOf(detail: AssessorVersionDetail | null): string {
  return detail
    ? serializeDraft(
        draftFromVersion(detail),
        String(detail.submission_id ?? ""),
      )
    : serializeDraft(emptyDraft(), "");
}

export function useVersionSaveFlow({
  draft,
  submissionId,
  submissionColumns,
  context,
  onSaved,
}: UseVersionSaveFlowParams): UseVersionSaveFlowResult {
  const { isSaving, save } = useAssessorSave();
  const [baseline, setBaseline] = useState(() => baselineOf(null));
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(null);
  const isDirty = useMemo(
    () => serializeDraft(draft, submissionId) !== baseline,
    [baseline, draft, submissionId],
  );

  const rebaseline = useCallback((detail: AssessorVersionDetail | null) => {
    setBaseline(baselineOf(detail));
    setSavedTitle(null);
    setIsReviewOpen(false);
  }, []);

  const saveVersion = useCallback(
    async (name: string, commitMessage: string) => {
      const saved = await save({
        draft,
        submissionId,
        submissionColumns,
        configId: context?.configId ?? null,
        name,
        commitMessage,
      });
      if (!saved) return;

      setIsReviewOpen(false);
      setBaseline(baselineOf(saved.detail));
      setSavedTitle(`Assessor "${name}" saved as v${saved.version}`);
      onSaved(
        {
          configId: saved.config_id,
          version: saved.version,
          assessorName: name,
        },
        saved.detail,
      );
    },
    [context, draft, onSaved, save, submissionColumns, submissionId],
  );

  return {
    isDirty,
    canSave: context ? isDirty : hasAssessmentContent(draft),
    isSaving,
    isReviewOpen,
    savedTitle,
    openReview: useCallback(() => setIsReviewOpen(true), []),
    closeReview: useCallback(() => setIsReviewOpen(false), []),
    saveVersion,
    dismissSaved: useCallback(() => setSavedTitle(null), []),
    rebaseline,
  };
}
