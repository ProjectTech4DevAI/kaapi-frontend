"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  UseRunSubmitParams,
  UseRunSubmitResult,
} from "@/app/lib/types/assessment";

export function useRunSubmit({
  context,
  submissionId,
  runName,
  onRunCreated,
}: UseRunSubmitParams): UseRunSubmitResult {
  const toast = useToast();
  const data = useAssessmentData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRun = useCallback(async () => {
    if (!context || !submissionId) return;
    setIsSubmitting(true);
    try {
      const run = await data.createRun({
        experiment_name: runName.trim() || `${context.assessorName} — new run`,
        submission_id: submissionId,
        config_id: context.configId,
        config_version: context.version,
      });
      toast.success(`Run "${run.experiment_name}" submitted`);
      onRunCreated(context);
    } catch (caught) {
      toast.error(getAsyncErrorMessage("start run", caught));
    } finally {
      setIsSubmitting(false);
    }
  }, [context, data, onRunCreated, runName, submissionId, toast]);

  return { isSubmitting, submitRun };
}
