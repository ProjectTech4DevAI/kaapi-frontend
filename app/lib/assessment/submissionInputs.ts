/**
 * Reads a run's source rows, from cache when we already have them.
 */
import { SUBMISSION_INPUT_ROW_LIMIT } from "@/app/lib/assessment/constants";
import {
  previewToInputs,
  type SubmissionInputs,
} from "@/app/lib/assessment/inputJoin";
import {
  readCachedInputs,
  writeCachedInputs,
} from "@/app/lib/assessment/submissionCache";
import type { AssessmentDataSource } from "@/app/lib/types/assessment";

export async function loadSubmissionInputs(
  source: AssessmentDataSource,
  submissionId: string,
  expectedRows = 0,
): Promise<SubmissionInputs> {
  const cached = await readCachedInputs(submissionId);
  // A short cache entry predates this feature's row limit — fetch the rest.
  if (cached && cached.records.length >= expectedRows) return cached;

  // The backend validates `limit_rows`, so ask for the run's own row count and
  // fall back to a modest ceiling only when the count is not known yet.
  const limitRows =
    expectedRows > 0 ? expectedRows : SUBMISSION_INPUT_ROW_LIMIT;
  const payload = await source.getSubmissionPreview(submissionId, limitRows);
  const inputs = previewToInputs(payload.preview);
  if (inputs.records.length > 0) {
    void writeCachedInputs(submissionId, inputs);
  }
  return inputs;
}
