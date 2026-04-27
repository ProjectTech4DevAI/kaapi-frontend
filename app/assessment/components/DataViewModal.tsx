"use client";

import { colors } from "@/app/lib/colors";

export interface DataViewModalProps {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  onClose: () => void;
}

/**
 * Reusable modal for viewing tabular data (dataset preview, result preview).
 */
export default function DataViewModal({
  title,
  subtitle,
  headers,
  rows,
  onClose,
}: DataViewModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl flex flex-col"
        style={{
          backgroundColor: colors.bg.primary,
          width: "85vw",
          maxWidth: "1100px",
          maxHeight: "80vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              {title}
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              {subtitle ?? `${rows.length} rows · ${headers.length} columns`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded"
            style={{ color: colors.text.secondary }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: colors.bg.secondary,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <th
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                  style={{
                    color: colors.text.secondary,
                    backgroundColor: colors.bg.secondary,
                    width: "40px",
                  }}
                ></th>
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-0"
                    style={{
                      color: colors.text.secondary,
                      backgroundColor: colors.bg.secondary,
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{ borderBottom: `1px solid ${colors.border}` }}
                >
                  <td
                    className="px-4 py-2.5 text-xs"
                    style={{ color: colors.text.secondary }}
                  >
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-4 py-2.5"
                      style={{ color: colors.text.primary }}
                    >
                      <div
                        className="text-sm"
                        style={{
                          maxHeight: "120px",
                          overflow: "auto",
                          lineHeight: "1.5",
                        }}
                      >
                        {cell || (
                          <span style={{ color: colors.text.secondary }}>
                            —
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert JSON result rows (array of objects) into headers + rows for DataViewModal.
 * Filters out metadata-heavy fields and drops columns where every value is empty.
 */
export function jsonResultsToTableData(
  results: Record<string, unknown>[],
  opts?: { skipFields?: Set<string> },
): { headers: string[]; rows: string[][] } {
  if (results.length === 0) return { headers: [], rows: [] };

  const skipFields =
    opts?.skipFields ??
    new Set([
      "assessment_id",
      "dataset_id",
      "dataset_name",
      "run_id",
      "run_name",
      "run_status",
      "config_id",
      "config_version",
      "response_id",
      "input_tokens",
      "output_tokens",
      "total_tokens",
      "updated_at",
      "result_status",
      "error",
      "row_id",
      "experiment_name",
    ]);

  const allKeys = Array.from(new Set(results.flatMap((r) => Object.keys(r))));
  const displayKeys = allKeys.filter((k) => !skipFields.has(k));

  // Drop columns where every row is null / empty
  const nonEmptyKeys = displayKeys.filter((key) =>
    results.some((r) => {
      const v = r[key];
      return v != null && String(v).trim() !== "";
    }),
  );

  const rows = results.map((r) =>
    nonEmptyKeys.map((key) => {
      const v = r[key];
      if (v == null) return "";
      if (typeof v === "object") return JSON.stringify(v);
      return String(v);
    }),
  );

  return { headers: nonEmptyKeys, rows };
}
