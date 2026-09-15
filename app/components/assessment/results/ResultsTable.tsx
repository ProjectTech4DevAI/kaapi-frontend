"use client";

interface ResultsTableProps {
  headers: string[];
  rows: string[][];
  onRowClick: (index: number) => void;
}

const NARROW_COLUMNS = ["cid", "language", "state", "district", "id"];

const isNumeric = (value: string) =>
  value.trim() !== "" && Number.isFinite(Number(value));

/** Spreadsheet-style read-only grid; a row opens its full assessment. */
export default function ResultsTable({
  headers,
  rows,
  onRowClick,
}: ResultsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto bg-bg-primary">
      <table className="min-w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-[5] min-w-9 border border-[#d5e3f8] bg-[#EFF6FF] px-3 py-2 text-left text-xs font-bold text-[#1E40AF]">
              #
            </th>
            {headers.map((header) => (
              <th
                key={header}
                className="sticky top-0 z-[5] border border-[#d5e3f8] bg-[#EFF6FF] px-3 py-2 text-left text-xs font-bold whitespace-nowrap text-[#1E40AF]"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              onClick={() => onRowClick(rowIndex)}
              className="cursor-pointer hover:bg-accent-subtle/10"
            >
              <td className="min-w-9 border border-border bg-bg-secondary px-3 py-2 text-center align-top text-xs text-text-secondary">
                {rowIndex + 1}
              </td>
              {row.map((cell, cellIndex) => {
                const header = headers[cellIndex]?.toLowerCase() ?? "";
                const narrow = NARROW_COLUMNS.includes(header);
                return (
                  <td
                    key={cellIndex}
                    className={`border border-border px-3 py-2 align-top ${
                      isNumeric(cell)
                        ? "text-right font-medium tabular-nums"
                        : ""
                    }`}
                  >
                    <div
                      className={`max-h-28 overflow-auto leading-6 ${
                        narrow
                          ? "whitespace-nowrap"
                          : "max-w-[340px] min-w-[180px] break-words whitespace-pre-wrap"
                      }`}
                    >
                      {cell}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
