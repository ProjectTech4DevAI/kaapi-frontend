/**
 * Submission-file fetchers. Network only, no React.
 *
 * The backend paths still read `/datasets`; everything they return is a submission.
 */
import { apiFetch } from "@/app/lib/apiClient";
import { DATASET_SAMPLE_ROW_LIMIT } from "@/app/lib/assessment/constants";
import type {
  AssessmentSubmission,
  CreateSubmissionInput,
  SubmissionPreviewPayload,
} from "@/app/lib/types/assessment";

const ENDPOINT = "/api/assessment/datasets";

type Envelope<T> = T | { data?: T };

const unwrap = <T>(response: Envelope<T>, fallback: T): T =>
  (response as { data?: T })?.data ?? (response as T) ?? fallback;

export async function listSubmissions(
  apiKey: string,
): Promise<AssessmentSubmission[]> {
  const response = await apiFetch<Envelope<AssessmentSubmission[]>>(
    ENDPOINT,
    apiKey,
  );
  return Array.isArray(response) ? response : unwrap(response, []);
}

export async function getSubmissionPreview(
  apiKey: string,
  submissionId: string,
): Promise<SubmissionPreviewPayload> {
  const response = await apiFetch<Envelope<AssessmentSubmission>>(
    `${ENDPOINT}/${submissionId}?limit_rows=${DATASET_SAMPLE_ROW_LIMIT}`,
    apiKey,
  );
  const submission = unwrap(response, {} as AssessmentSubmission);
  return {
    total_items: submission.total_items,
    preview: submission.preview ?? undefined,
  };
}

export async function createSubmission(
  apiKey: string,
  { name, description, file }: CreateSubmissionInput,
): Promise<AssessmentSubmission> {
  const body = new FormData();
  body.append("dataset_name", name);
  if (description) body.append("description", description);
  body.append("file", file);

  const response = await apiFetch<Envelope<AssessmentSubmission>>(
    ENDPOINT,
    apiKey,
    { method: "POST", body },
  );
  return unwrap(response, {} as AssessmentSubmission);
}

export async function deleteSubmission(
  apiKey: string,
  submissionId: string,
): Promise<void> {
  await apiFetch<null>(`${ENDPOINT}/${submissionId}`, apiKey, {
    method: "DELETE",
    acceptEmpty: true,
  });
}
