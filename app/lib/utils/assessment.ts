import { apiFetch } from "@/app/lib/apiClient";
import {
  ALLOWED_DATASET_EXTENSIONS,
  JSON_TOKEN_CLASSES,
} from "@/app/lib/assessment/constants";
import type {
  CreateDatasetResponse,
  DatasetPreview,
  DatasetPreviewResponse,
} from "@/app/lib/types/assessment";

export function isAllowedDatasetFile(fileName: string): boolean {
  const normalizedName = fileName.toLowerCase();
  return ALLOWED_DATASET_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
}

export async function fetchDatasetPreview(
  id: string | number,
  apiKey: string,
  limit: number,
): Promise<DatasetPreview> {
  let res: DatasetPreviewResponse;
  try {
    res = await apiFetch<DatasetPreviewResponse>(
      `/api/assessment/datasets/${id}?limit_rows=${limit}`,
      apiKey,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch dataset preview";
    throw new Error(message);
  }

  const payload = res?.data ?? res;
  const preview = payload?.preview;
  if (!preview) {
    throw new Error("Dataset preview is unavailable.");
  }

  const headers = preview.headers ?? [];
  if (headers.length === 0) {
    throw new Error("Dataset file is missing column headers.");
  }

  return {
    headers,
    rows: preview.rows ?? [],
    totalItems: payload?.total_items ?? preview.returned_rows ?? 0,
    truncated: Boolean(preview.truncated),
  };
}

export function extractCreatedDataset(data: CreateDatasetResponse) {
  return (
    (data as { data?: { dataset_id?: number; dataset_name?: string } }).data ??
    (data as { dataset_id?: number; dataset_name?: string })
  );
}

export function handleForbiddenError(
  error: unknown,
  onForbidden?: () => void,
): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  const isForbidden =
    /request failed:\s*403/i.test(error.message) ||
    message.includes("forbidden") ||
    message.includes("not enabled") ||
    message.includes("permission denied");

  if (!isForbidden) return false;
  onForbidden?.();
  return true;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

const CONFIG_VERSION_UNAVAILABLE_MESSAGE =
  "Config version was tampered or changed.";

export function getConfigDetailErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  if (
    message.includes("404") ||
    normalized.includes("not found") ||
    normalized.includes("unavailable")
  ) {
    return CONFIG_VERSION_UNAVAILABLE_MESSAGE;
  }
  return message || "Failed to load configuration details";
}

export function highlightJson(code: string): string {
  if (!code) return "";

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  let result = "";
  let cursor = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code)) !== null) {
    if (cursor < m.index) {
      result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(code.slice(cursor, m.index))}</span>`;
    }
    if (m[1] !== undefined) {
      const isKey = !!m[2];
      result += `<span class="${isKey ? JSON_TOKEN_CLASSES.key : JSON_TOKEN_CLASSES.string}">${escHtml(m[1])}</span>`;
      if (m[2])
        result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(m[2])}</span>`;
      cursor = m.index + m[0].length;
    } else if (m[3] !== undefined) {
      result += `<span class="${m[3] === "null" ? JSON_TOKEN_CLASSES.null : JSON_TOKEN_CLASSES.boolean}">${escHtml(m[3])}</span>`;
      cursor = m.index + m[3].length;
    } else if (m[4] !== undefined) {
      result += `<span class="${JSON_TOKEN_CLASSES.number}">${escHtml(m[4])}</span>`;
      cursor = m.index + m[4].length;
    }
  }

  if (cursor < code.length) {
    result += `<span class="${JSON_TOKEN_CLASSES.punct}">${escHtml(code.slice(cursor))}</span>`;
  }

  return result;
}

export function isBlankCell(cell: string | undefined): boolean {
  return cell == null || String(cell).trim() === "";
}

// A run pairs a saved config with a dataset. The config already carries its
// input_schema + output schema, so the run only validates dataset, config
// selection, that the chosen config defines input fields, and a run name.
interface AssessmentSubmitChecks {
  datasetId: string | null;
  hasInputSchema: boolean;
  configCount: number;
  experimentName: string;
  hasPrompt: boolean;
}

export function getAssessmentSubmitError(
  checks: AssessmentSubmitChecks,
): string | null {
  if (!checks.datasetId) return "Dataset is required";
  if (checks.configCount === 0) return "Select at least one configuration";
  if (!checks.hasInputSchema)
    return "Selected configuration has no input fields";
  if (!checks.experimentName.trim()) return "Experiment name is required";
  if (!checks.hasPrompt) return "Enter a user prompt";
  return null;
}

export function getAssessmentSubmitBlocker(
  checks: AssessmentSubmitChecks,
): string {
  if (!checks.datasetId) return "Select a dataset to submit";
  if (checks.configCount === 0)
    return "Select at least one configuration to submit";
  if (!checks.hasInputSchema)
    return "Selected configuration has no input fields";
  if (!checks.experimentName.trim())
    return "Enter an experiment name to submit";
  if (!checks.hasPrompt) return "Enter a user prompt to submit";
  return "";
}
