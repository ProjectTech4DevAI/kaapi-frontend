import { previewToInputs } from "@/app/lib/assessment/inputJoin";
import {
  readCachedInputs,
  writeCachedInputs,
} from "@/app/lib/assessment/submissionCache";
import type {
  AssessmentDataSource,
  SubmissionInputs,
} from "@/app/lib/types/assessment";

export async function loadSubmissionInputs(
  source: AssessmentDataSource,
  submissionId: string,
  expectedRows = 0,
): Promise<SubmissionInputs> {
  if (expectedRows <= 0) return { headers: [], records: [] };

  const cached = await readCachedInputs(submissionId);
  if (cached && cached.records.length >= expectedRows) return cached;

  const payload = await source.getSubmissionPreview(submissionId, expectedRows);
  const inputs = previewToInputs(payload.preview);
  if (inputs.records.length > 0) {
    void writeCachedInputs(submissionId, inputs);
  }
  return inputs;
}
