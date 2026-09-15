"use client";

/**
 * Saving an assessor version: bump `vN+1` (or create `v1`), then re-baseline so
 * the wizard stops reporting a diff. After a save the flow continues in run
 * context, which is why the caller gets the new version back.
 */
import { useCallback, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import {
  draftToVersionInput,
  versionDetailFrom,
} from "@/app/lib/assessment/draft";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  AssessorVersionDetail,
  SaveAssessorVersionResult,
  WizardDraft,
} from "@/app/lib/types/assessment";

export interface SaveAssessorParams {
  draft: WizardDraft;
  submissionId: string;
  submissionColumns: string[];
  configId: string | null;
  name: string;
  commitMessage: string;
}

export interface UseAssessorSaveResult {
  isSaving: boolean;
  save: (
    params: SaveAssessorParams,
  ) => Promise<
    (SaveAssessorVersionResult & { detail: AssessorVersionDetail }) | null
  >;
}

export function useAssessorSave(): UseAssessorSaveResult {
  const toast = useToast();
  const data = useAssessmentData();
  const [isSaving, setIsSaving] = useState(false);

  const save = useCallback(
    async (params: SaveAssessorParams) => {
      setIsSaving(true);
      try {
        const input = draftToVersionInput(params);
        const saved = await data.saveAssessorVersion(input);
        toast.success(`Assessor "${params.name}" saved as v${saved.version}`);
        return {
          ...saved,
          detail: versionDetailFrom(input, saved.config_id, saved.version),
        };
      } catch (caught) {
        toast.error(getAsyncErrorMessage("save assessor", caught));
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [data, toast],
  );

  return { isSaving, save };
}
