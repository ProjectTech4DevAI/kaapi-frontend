/**
 * Assessor fetchers. Assessors are ASSESSMENT-tagged configs, so these ride the
 * existing `/api/configs` routes. Network only, no React.
 */
import { apiFetch } from "@/app/lib/apiClient";
import { ASSESSMENT_TAG } from "@/app/lib/assessment/constants";
import {
  blobToVersionDetail,
  versionDetailToBlob,
  type AssessmentBlob,
} from "@/app/lib/assessment/configBlob";
import {
  fetchConfigPage,
  fetchConfigVersionDetail,
  fetchConfigVersionsPage,
} from "@/app/lib/utils/assessmentFetcher";
import type {
  AssessorPageQuery,
  AssessorSummary,
  AssessorVersion,
  AssessorVersionDetail,
  PagedResult,
  SaveAssessorVersionInput,
  SaveAssessorVersionResult,
} from "@/app/lib/types/assessment";
import type {
  ConfigVersionResponse,
  ConfigWithVersion,
} from "@/app/lib/types/configs";

const VERSION_PAGE_LIMIT = 100;

/** One page of assessors; `has_more` from the API drives the next/prev chevrons. */
export async function listAssessors(
  apiKey: string,
  page: AssessorPageQuery = {},
): Promise<PagedResult<AssessorSummary>> {
  return fetchConfigPage({
    apiKey,
    skip: page.skip,
    limit: page.limit,
    search: page.search,
  });
}

export async function listAssessorVersions(
  apiKey: string,
  configId: string,
): Promise<AssessorVersion[]> {
  const page = await fetchConfigVersionsPage(apiKey, configId, {
    limit: VERSION_PAGE_LIMIT,
  });
  return page.items;
}

export async function getAssessorVersion(
  apiKey: string,
  configId: string,
  version: number,
): Promise<AssessorVersionDetail> {
  const detail = await fetchConfigVersionDetail(apiKey, configId, version);
  return blobToVersionDetail(
    configId,
    detail.version,
    detail.commit_message ?? null,
    detail.config_blob as unknown as AssessmentBlob,
  );
}

export async function deleteAssessor(
  apiKey: string,
  configId: string,
): Promise<void> {
  const response = await apiFetch<{ success: boolean; error?: string }>(
    `/api/configs/${configId}`,
    apiKey,
    { method: "DELETE" },
  );
  if (!response.success) {
    throw new Error(response.error || "Failed to delete the assessor");
  }
}

export async function deleteAssessorVersion(
  apiKey: string,
  configId: string,
  version: number,
): Promise<void> {
  const response = await apiFetch<{ success: boolean; error?: string }>(
    `/api/configs/${configId}/versions/${version}`,
    apiKey,
    { method: "DELETE" },
  );
  if (!response.success) {
    throw new Error(response.error || "Failed to delete the version");
  }
}

/** First save creates the config with its v1 blob; later saves append a version. */
export async function saveAssessorVersion(
  apiKey: string,
  input: SaveAssessorVersionInput,
): Promise<SaveAssessorVersionResult> {
  const configBlob = versionDetailToBlob(input);
  const commitMessage = input.commit_message || "Updated assessor";

  if (!input.config_id) {
    const created = await apiFetch<{
      success: boolean;
      data?: ConfigWithVersion;
      error?: string;
    }>("/api/configs", apiKey, {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        description: input.description ?? null,
        tag: ASSESSMENT_TAG,
        config_blob: configBlob,
        commit_message: commitMessage,
      }),
    });
    if (!created.success || !created.data) {
      throw new Error(created.error || "Failed to create the assessor");
    }
    return {
      config_id: created.data.id,
      version: created.data.version.version,
    };
  }

  const query = new URLSearchParams({ tag: ASSESSMENT_TAG });
  const response = await apiFetch<ConfigVersionResponse>(
    `/api/configs/${input.config_id}/versions?${query}`,
    apiKey,
    {
      method: "POST",
      body: JSON.stringify({
        config_blob: configBlob,
        commit_message: commitMessage,
      }),
    },
  );
  if (!response.success || !response.data) {
    throw new Error(response.error || "Failed to save the assessor version");
  }
  return { config_id: input.config_id, version: response.data.version };
}
