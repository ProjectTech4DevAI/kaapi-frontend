"use client";

import { Modal } from "@/app/components";
import CloseIcon from "@/app/components/icons/document/CloseIcon";
interface DataViewModalProps {
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
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="sticky top-0 z-10 w-10 bg-neutral-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500"></th>
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="sticky top-0 z-10 w-40 min-w-[10rem] max-w-[10rem] bg-neutral-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-normal break-words text-neutral-500"
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
                  <td
                    key={cellIdx}
                    className="w-40 min-w-[10rem] max-w-[10rem] px-4 py-2.5 align-top text-neutral-900"
                  >
                    <div className="max-h-[120px] overflow-auto whitespace-pre-wrap break-words text-sm leading-6">
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
