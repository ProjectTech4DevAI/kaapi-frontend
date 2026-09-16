"use client";

/**
 * The run-name field on step 4. Defaults to `{assessor} — run {n}` once the
 * assessor's existing runs are counted, the way the prototype names runs.
 */
import { useEffect, useState } from "react";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import type { WizardContext } from "@/app/lib/types/assessment";

export interface UseRunNameDraftResult {
  runName: string;
  setRunName: (value: string) => void;
}

export function useRunNameDraft(
  context: WizardContext | null,
  isRunStep: boolean,
): UseRunNameDraftResult {
  const data = useAssessmentData();
  const [runName, setRunName] = useState("");

  useEffect(() => {
    if (!isRunStep || !context) return;
    let cancelled = false;
    void data.listAssessments().then((runs) => {
      const count = runs.filter(
        (run) => run.config?.id === context.configId,
      ).length;
      if (!cancelled) setRunName(`${context.assessorName} — run ${count + 1}`);
    });
    return () => {
      cancelled = true;
    };
  }, [context, data, isRunStep]);

  return { runName, setRunName };
}
