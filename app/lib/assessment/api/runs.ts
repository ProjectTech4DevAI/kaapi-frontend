import { apiFetch } from "@/app/lib/apiClient";
import { unwrapResponse } from "@/app/lib/utils";
import { ASSESSMENT_BATCH_ENDPOINT } from "@/app/lib/assessment/constants";
import { flattenBatchDetail } from "@/app/lib/assessment/batchResults";
import type {
  CreateResponse,
  AssessmentDetail,
  AssessmentResultsPayload,
  AssessmentRun,
  CreateRunInput,
  ListAssessmentsQuery,
  ResultsTarget,
} from "@/app/lib/types/assessment";

function buildQuery(query: ListAssessmentsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `?${search}` : "";
}

export async function listAssessments(
  apiKey: string,
  query: ListAssessmentsQuery = {},
): Promise<AssessmentRun[]> {
  const response = await apiFetch<CreateResponse<AssessmentRun[]>>(
    `${ASSESSMENT_BATCH_ENDPOINT}${buildQuery(query)}`,
    apiKey,
  );
  return Array.isArray(response) ? response : unwrapResponse(response, []);
}

export async function getAssessmentDetail(
  apiKey: string,
  assessmentId: string,
): Promise<AssessmentDetail> {
  const response = await apiFetch<CreateResponse<AssessmentDetail>>(
    `${ASSESSMENT_BATCH_ENDPOINT}/${assessmentId}`,
    apiKey,
  );
  return unwrapResponse(response, {} as AssessmentDetail);
}

export async function createRun(
  apiKey: string,
  input: CreateRunInput,
): Promise<AssessmentRun> {
  const response = await apiFetch<CreateResponse<{ assessment_id: string }>>(
    ASSESSMENT_BATCH_ENDPOINT,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        experiment_name: input.experiment_name,
        config: { id: input.config_id, version: input.config_version },
        input: { submission_doc_id: input.submission_id },
      }),
    },
  );
  const ack = unwrapResponse(response, {} as { assessment_id: string });
  return getAssessmentDetail(apiKey, ack.assessment_id);
}

export async function getRunResults(
  apiKey: string,
  target: ResultsTarget,
): Promise<AssessmentResultsPayload> {
  const detail = await getAssessmentDetail(apiKey, target.assessment_id);
  return {
    status: detail.status,
    rows: flattenBatchDetail(detail),
    total_items: detail.total_items ?? 0,
    counts: detail.counts ?? null,
    submission_id: detail.submission_id ?? null,
    config: detail.config ?? null,
  };
}
