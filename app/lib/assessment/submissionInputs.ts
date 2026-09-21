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
  // Ask for the run's own row count, clamped to what the endpoint accepts — it
  // 422s above the cap, which would cost us the rows it would still have served.
  const limitRows = Math.min(
    expectedRows > 0 ? expectedRows : SUBMISSION_INPUT_ROW_LIMIT,
    SUBMISSION_INPUT_ROW_LIMIT,
  );

  const cached = await readCachedInputs(submissionId);
  // A shorter entry was cached under a smaller ask — fetch the rest.
  if (cached && cached.records.length >= limitRows) return cached;

  const payload = await source.getSubmissionPreview(submissionId, limitRows);
  const inputs = previewToInputs(payload.preview);
  if (inputs.records.length > 0) {
    void writeCachedInputs(submissionId, inputs);
  }
  return inputs;
}
