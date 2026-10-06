"use client";

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
  UseVersionSaveFlowParams,
  UseVersionSaveFlowResult,
} from "@/app/lib/types/assessment";

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
