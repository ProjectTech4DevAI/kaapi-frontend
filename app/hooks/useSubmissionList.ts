"use client";

/** Loads submission sets and their previews through the data source, caching previews. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import { useAssessmentFeatureGuard } from "@/app/hooks/useAssessmentFeatureGuard";
import { toDatasetPreview } from "@/app/lib/utils/assessment";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  AssessmentSubmission,
  DatasetPreview,
} from "@/app/lib/types/assessment";

export interface UseSubmissionListResult {
  submissions: AssessmentSubmission[];
  isLoading: boolean;
  reload: () => Promise<void>;
  loadPreview: (id: string) => Promise<DatasetPreview>;
  forgetPreview: (id: string) => void;
}

export function useSubmissionList(): UseSubmissionListResult {
  const toast = useToast();
  const data = useAssessmentData();
  const { guard } = useAssessmentFeatureGuard();
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const previewCache = useRef<Record<string, DatasetPreview>>({});

  const reload = useCallback(async () => {
    try {
      setSubmissions(await data.listSubmissions());
    } catch (caught) {
      if (guard(caught)) return;
      toast.error(getAsyncErrorMessage("load submissions", caught));
    } finally {
      setIsLoading(false);
    }
  }, [data, guard, toast]);

  const loadPreview = useCallback(
    async (id: string) => {
      const cached = previewCache.current[id];
      if (cached) return cached;
      const preview = toDatasetPreview(await data.getSubmissionPreview(id));
      previewCache.current[id] = preview;
      return preview;
    },
    [data],
  );

  const forgetPreview = useCallback((id: string) => {
    delete previewCache.current[id];
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { submissions, isLoading, reload, loadPreview, forgetPreview };
}
