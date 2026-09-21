/**
 * API-backed assessment data source. Composition only — fetchers live in `api/`.
 */
import * as assessors from "@/app/lib/assessment/api/assessors";
import * as runs from "@/app/lib/assessment/api/runs";
import * as submissions from "@/app/lib/assessment/api/submissions";
import type { AssessmentDataSource } from "@/app/lib/types/assessment";

export function createApiAssessmentSource(
  apiKey: string,
): AssessmentDataSource {
  return {
    listSubmissions: () => submissions.listSubmissions(apiKey),
    getSubmissionPreview: (submissionId, limitRows) =>
      submissions.getSubmissionPreview(apiKey, submissionId, limitRows),
    createSubmission: (input) => submissions.createSubmission(apiKey, input),
    deleteSubmission: (submissionId) =>
      submissions.deleteSubmission(apiKey, submissionId),

    listAssessors: (page) => assessors.listAssessors(apiKey, page),
    listAssessorVersions: (configId) =>
      assessors.listAssessorVersions(apiKey, configId),
    getAssessorVersion: (configId, version) =>
      assessors.getAssessorVersion(apiKey, configId, version),
    deleteAssessor: (configId) => assessors.deleteAssessor(apiKey, configId),
    deleteAssessorVersion: (configId, version) =>
      assessors.deleteAssessorVersion(apiKey, configId, version),
    saveAssessorVersion: (input) =>
      assessors.saveAssessorVersion(apiKey, input),

    listAssessments: (query) => runs.listAssessments(apiKey, query),
    createRun: (input) => runs.createRun(apiKey, input),
    getRunResults: (target) => runs.getRunResults(apiKey, target),
  };
}
