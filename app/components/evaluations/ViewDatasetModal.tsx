"use client";

import { Button, Modal } from "@/app/components/ui";
import { ViewDatasetModalData } from "@/app/lib/types/dataset";
import { CloseIcon, DownloadIcon } from "@/app/components/icons";

interface ViewDatasetModalProps {
  data: ViewDatasetModalData;
  onClose: () => void;
}

export default function ViewDatasetModal({
  data,
  onClose,
}: ViewDatasetModalProps) {
  const idIndex = data.headers.findIndex(
    (h) => h.trim().toLowerCase() === "id",
  );
  const visibleHeaders =
    idIndex === -1
      ? data.headers
      : data.headers.filter((_, i) => i !== idIndex);
  const visibleRows =
    idIndex === -1
      ? data.rows
      : data.rows.map((row) => row.filter((_, i) => i !== idIndex));

  const handleDownload = () => {
    const csvLines = [data.headers.join(",")];
    data.rows.forEach((row) => {
      csvLines.push(
        row
          .map((cell) =>
            cell.includes(",") || cell.includes('"') || cell.includes("\n")
              ? `"${cell.replace(/"/g, '""')}"`
              : cell,
          )
          .join(","),
      );
    });
    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.name}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      open
      onClose={onClose}
      showClose={false}
      maxWidth="max-w-[1000px]"
      maxHeight="max-h-[80vh]"
    >
      <div className="sticky top-0 bg-bg-primary border-b border-border px-6 py-4 flex items-start justify-between gap-4 z-10">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text-primary truncate">
            {data.name}
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            {visibleRows.length} rows · {visibleHeaders.length} columns
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <Button size="sm" onClick={handleDownload}>
            <DownloadIcon className="w-4 h-4" /> Download CSV
          </Button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-13 text-text-secondary bg-bg-secondary w-10" />
            {visibleHeaders.map((header, i) => (
              <th
                key={i}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-13 text-text-secondary bg-bg-secondary"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border">
              <td className="px-4 py-2.5 text-xs text-text-secondary">
                {rowIdx + 1}
              </td>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-2.5 text-text-primary">
                  <div className="text-sm max-h-[120px] overflow-auto leading-relaxed">
                    {cell || <span className="text-text-secondary">—</span>}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
