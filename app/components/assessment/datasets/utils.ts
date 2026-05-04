import * as XLSX from "xlsx";
import { apiFetch } from "@/app/lib/apiClient";
import { ALLOWED_DATASET_EXTENSIONS } from "@/app/lib/assessment/constants";
import type {
  CreateDatasetResponse,
  DatasetFileResponse,
  ParsedDatasetFile,
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
