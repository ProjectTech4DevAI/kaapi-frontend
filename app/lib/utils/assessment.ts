import { apiFetch } from "@/app/lib/apiClient";
import {
  ALLOWED_DATASET_EXTENSIONS,
  JSON_TOKEN_CLASSES,
} from "@/app/lib/assessment/constants";
import type {
  DatasetPreview,
  DatasetPreviewResponse,
  PageSlice,
  SchemaProperty,
} from "@/app/lib/types/assessment";

export function isAllowedDatasetFile(fileName: string): boolean {
  const normalizedName = fileName.toLowerCase();
  return ALLOWED_DATASET_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
}

export function toDatasetPreview(
  response: DatasetPreviewResponse,
): DatasetPreview {
  const payload = response?.data ?? response;
  const preview = payload?.preview;
  if (!preview) {
    throw new Error("Dataset preview is unavailable.");
  }

  const headers = preview.headers ?? [];
  if (headers.length === 0) {
    throw new Error("Dataset file is missing column headers.");
  }

  const rowCount = preview.returned_rows ?? 0;
  return {
    headers,
    rows: preview.rows ?? [],
    totalItems: payload.total_items ?? rowCount,
    truncated: Boolean(preview.truncated),
  };
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

  return toDatasetPreview(res);
}

export function nonBlankColumns(preview: DatasetPreview): {
  headers: string[];
  sampleRow: Record<string, string>;
} {
  const keptIdx = preview.headers
    .map((_, colIdx) => colIdx)
    .filter((colIdx) => !isBlankCell(preview.headers[colIdx]));

  const firstRow = preview.rows[0] || [];
  return {
    headers: keptIdx.map((idx) => preview.headers[idx]),
    sampleRow: Object.fromEntries(
      keptIdx.map((idx) => [preview.headers[idx], String(firstRow[idx] ?? "")]),
    ),
  };
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

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): PageSlice<T> {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(1, page), pages);
  return {
    items: items.slice((safePage - 1) * perPage, safePage * perPage),
    page: safePage,
    pages,
    total: items.length,
  };
}

export function pageWindow(
  page: number,
  pages: number,
  size: number,
): number[] {
  const start = Math.max(1, Math.min(page - 1, pages - size + 1));
  const end = Math.min(pages, start + size - 1);
  const window: number[] = [];
  for (let candidate = start; candidate <= end; candidate += 1) {
    window.push(candidate);
  }
  return window;
}

export function schemaToJsonSchema(
  properties: SchemaProperty[],
): object | null {
  if (properties.length === 0) return null;

  const props: Record<string, object> = {};
  const required: string[] = [];

  properties.forEach((property) => {
    if (!property.name.trim()) return;

    let definition: object;
    if (property.type === "object") {
      definition = schemaToJsonSchema(property.children) || { type: "object" };
    } else if (property.type === "enum") {
      definition = {
        type: "string",
        enum: property.enumValues.filter((value) => value.trim()),
      };
    } else {
      definition = { type: property.type };
    }

    if (property.isArray) {
      definition = { type: "array", items: definition };
    }

    props[property.name] = definition;
    if (property.isRequired) {
      required.push(property.name);
    }
  });

  if (Object.keys(props).length === 0) return null;

  return {
    type: "object",
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  };
}
