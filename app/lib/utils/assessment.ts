import * as XLSX from "xlsx";
import { apiFetch } from "@/app/lib/apiClient";
import {
  ALLOWED_DATASET_EXTENSIONS,
  JSON_TOKEN_CLASSES,
} from "@/app/lib/assessment/constants";
import type {
  ColumnConfig,
  ColumnMapping,
  ColumnRole,
  CreateDatasetResponse,
  DatasetFileResponse,
  ParsedDatasetFile,
  ReviewColumn,
  RoleVisuals,
} from "@/app/lib/types/assessment";

export function isAllowedDatasetFile(fileName: string): boolean {
  const normalizedName = fileName.toLowerCase();
  return ALLOWED_DATASET_EXTENSIONS.some((extension) =>
    normalizedName.endsWith(extension),
  );
}

export async function fetchAndParseDatasetFile(
  id: string | number,
  apiKey: string,
): Promise<ParsedDatasetFile> {
  let json: DatasetFileResponse;
  try {
    json = await apiFetch<DatasetFileResponse>(
      `/api/assessment/datasets/${id}?fetch_content=true`,
      apiKey,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to download dataset file";
    throw new Error(message);
  }

  const base64 = json?.file_content;
  if (!base64) {
    throw new Error("Dataset file content is unavailable.");
  }

  const binary = Uint8Array.from(atob(base64), (character) =>
    character.charCodeAt(0),
  );
  const workbook = XLSX.read(binary, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error("Dataset file does not contain a readable sheet.");
  }

  const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });
  if (rawData.length === 0) {
    throw new Error("Dataset file is empty.");
  }

  const headers = rawData[0].map(String);
  if (headers.length === 0 || headers.every((header) => !header.trim())) {
    throw new Error("Dataset file is missing column headers.");
  }

  const rows = rawData
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim() !== ""));

  if (rows.length === 0) {
    throw new Error("Dataset file has headers but no data rows.");
  }

  return { headers, rows: rows.map((row) => row.map(String)) };
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

export function colorMapping(role: ColumnRole): RoleVisuals {
  switch (role) {
    case "text":
      return {
        panelClass: "border-status-success-border bg-status-success-bg",
        dotClass: "bg-status-success",
        activeButtonClass:
          "!border-status-success-border !bg-status-success-bg !text-status-success-text hover:!bg-status-success-bg !ring-0",
      };
    case "attachment":
      return {
        panelClass: "border-status-warning-border bg-status-warning-bg",
        dotClass: "bg-status-warning",
        activeButtonClass:
          "!border-status-warning-border !bg-status-warning-bg !text-status-warning-text hover:!bg-status-warning-bg !ring-0",
      };
    case "ground_truth":
      return {
        panelClass: "border-accent-subtle bg-accent-subtle/20",
        dotClass: "bg-accent-primary",
        activeButtonClass:
          "!border-accent-subtle !bg-accent-subtle/20 !text-accent-primary hover:!bg-accent-subtle/20 !ring-0",
      };
    case "unmapped":
    default:
      return {
        panelClass: "border-border bg-bg-primary",
        dotClass: "bg-border",
        activeButtonClass:
          "!border-border !bg-bg-secondary !text-text-primary hover:!bg-bg-secondary !ring-0",
      };
  }
}

export function buildColumnConfigs(
  columns: string[],
  columnMapping: ColumnMapping,
): ColumnConfig[] {
  return columns.map((column) => {
    if (columnMapping.textColumns.includes(column)) {
      return { role: "text" };
    }
    const attachment = columnMapping.attachments.find(
      (item) => item.column === column,
    );
    return attachment
      ? {
          role: "attachment",
          attachmentType: attachment.type,
          attachmentFormat: attachment.format,
        }
      : { role: "unmapped" };
  });
}

export function buildMappedColumns(
  columnMapping: ColumnMapping,
): ReviewColumn[] {
  return [
    ...columnMapping.textColumns.map((column) => ({
      key: `text:${column}`,
      column,
      role: "text" as const,
      badgeClass: "bg-status-success-bg text-status-success-text",
    })),
    ...columnMapping.attachments.map(({ column }) => ({
      key: `attachment:${column}`,
      column,
      role: "attachment" as const,
      badgeClass: "bg-status-warning-bg text-status-warning-text",
    })),
    ...columnMapping.groundTruthColumns.map((column) => ({
      key: `ground_truth:${column}`,
      column,
      role: "ground truth" as const,
      badgeClass: "bg-accent-subtle/30 text-accent-primary",
    })),
  ];
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
