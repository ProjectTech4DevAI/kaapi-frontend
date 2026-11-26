"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import { nonBlankColumns, toDatasetPreview } from "@/app/lib/utils/assessment";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  AssessmentDataSource,
  AssessmentDatasetState,
  AssessorVersionDetail,
  UseAssessorVersionContextResult,
  WizardContext,
} from "@/app/lib/types/assessment";

export function useAssessorVersionContext(): UseAssessorVersionContextResult {
  const toast = useToast();
  const data = useAssessmentData();
  const setDataset = useAssessmentDatasetStore((state) => state.setDataset);
  const [versionDetail, setVersionDetail] =
    useState<AssessorVersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(
    (
      context: WizardContext,
      onLoaded: (detail: AssessorVersionDetail) => void,
    ) => {
      setIsLoading(true);
      setVersionDetail(null);
      data
        .getAssessorVersion(context.configId, context.version)
        .then(async (detail) => {
          setVersionDetail(detail);
          onLoaded(detail);
          await selectLinkedSubmission(data, detail, setDataset);
        })
        .catch((caught) =>
          toast.error(getAsyncErrorMessage("load assessor version", caught)),
        )
        .finally(() => setIsLoading(false));
    },
    [data, setDataset, toast],
  );

  const adopt = useCallback((detail: AssessorVersionDetail) => {
    setVersionDetail(detail);
  }, []);

  const reset = useCallback(() => setVersionDetail(null), []);

  return { versionDetail, isLoading, load, adopt, reset };
}

const LINKED_RUN_LOOKUP_LIMIT = 5;

async function linkedSubmissionId(
  data: AssessmentDataSource,
  detail: AssessorVersionDetail,
): Promise<string | null> {
  if (detail.submission_id) return String(detail.submission_id);

  const runs = await data.listAssessments({
    config_id: detail.config_id,
    version: detail.version,
    limit: LINKED_RUN_LOOKUP_LIMIT,
  });
  return runs.find((run) => run.submission_id)?.submission_id ?? null;
}

async function selectLinkedSubmission(
  data: AssessmentDataSource,
  detail: AssessorVersionDetail,
  setDataset: AssessmentDatasetState["setDataset"],
): Promise<void> {
  const id = await linkedSubmissionId(data, detail);
  if (!id) return;

  const [submissions, preview] = await Promise.all([
    data.listSubmissions(),
    data.getSubmissionPreview(id).then(toDatasetPreview),
  ]);

  const name = submissions.find((item) => item.submission_id === id)?.name;
  const { headers, sampleRow } = nonBlankColumns(preview);
  setDataset(id, headers, sampleRow, name);
}
