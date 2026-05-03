"use client";

import { Button, Modal } from "@/app/components";
import { ViewDatasetModalData } from "@/app/lib/types/dataset";

interface ViewDatasetModalProps {
  data: ViewDatasetModalData;
  onClose: () => void;
}

export default function ViewDatasetModal({
  data,
  onClose,
}: ViewDatasetModalProps) {
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
      title={data.name}
      maxWidth="max-w-[1000px]"
      maxHeight="max-h-[80vh]"
    >
      <div className="sticky top-0 bg-bg-primary border-b border-border px-6 py-3 flex items-center justify-between gap-4 z-10">
        <p className="text-xs text-text-secondary">
          {data.rows.length} rows · {data.headers.length} columns
        </p>
        <Button size="sm" onClick={handleDownload}>
          Download CSV
        </Button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-bg-secondary border-b border-border">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide sticky top-13 text-text-secondary bg-bg-secondary w-10" />
            {data.headers.map((header, i) => (
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
          {data.rows.map((row, rowIdx) => (
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
