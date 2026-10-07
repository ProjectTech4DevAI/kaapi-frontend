"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import {
  draftToVersionInput,
  versionDetailFrom,
} from "@/app/lib/assessment/draft";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  SaveAssessorParams,
  UseAssessorSaveResult,
} from "@/app/lib/types/assessment";

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
