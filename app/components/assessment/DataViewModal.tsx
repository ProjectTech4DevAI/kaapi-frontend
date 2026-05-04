"use client";

import { Modal } from "@/app/components";
import CloseIcon from "@/app/components/icons/document/CloseIcon";
import type { DataViewModalProps } from "@/app/lib/types/assessment";

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
    <Modal
      open
      onClose={onClose}
      maxWidth="w-[85vw] max-w-[1100px]"
      maxHeight="max-h-[80vh]"
      showClose={false}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            {subtitle ?? `${rows.length} rows · ${headers.length} columns`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="sticky top-0 w-10 bg-neutral-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"></th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="sticky top-0 bg-neutral-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-neutral-200">
                <td className="px-4 py-2.5 text-xs text-neutral-500">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-4 py-2.5 text-neutral-900">
                    <div className="max-h-[120px] overflow-auto text-sm leading-6">
                      {cell || <span className="text-neutral-500">—</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
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
