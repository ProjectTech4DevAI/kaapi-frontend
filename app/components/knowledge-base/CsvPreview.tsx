"use client";

import { useEffect, useState } from "react";
import { Loader } from "@/app/components/ui";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetchResponse } from "@/app/lib/apiClient";
import { parseCsv } from "@/app/lib/utils/csv";
import { CsvPreviewProps, ParsedCsv } from "@/app/lib/types/document";

export default function CsvPreview({ url }: CsvPreviewProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [data, setData] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    apiFetchResponse(url, apiKey)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setData(parseCsv(text));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Couldn't load CSV");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, apiKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader size="md" message="Loading CSV…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
        <p className="text-sm text-text-secondary">
          Couldn't load CSV preview.
        </p>
        <p className="text-xs text-text-secondary">{error}</p>
      </div>
    );
  }
  if (!data || data.headers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-text-secondary">CSV is empty.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-bg-primary">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-bg-secondary border-b border-border">
          <tr>
            {data.headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold text-text-primary border-r border-border last:border-r-0 whitespace-nowrap"
              >
                {h || `Column ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-border last:border-b-0 hover:bg-bg-secondary/40"
            >
              {data.headers.map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-text-secondary border-r border-border last:border-r-0 align-top"
                >
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
