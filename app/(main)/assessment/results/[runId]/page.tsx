"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader } from "@/app/components/ui";
import ResultRowModal from "@/app/components/assessment/results/ResultRowModal";
import ResultsTable from "@/app/components/assessment/results/ResultsTable";
import ResultsToolbar from "@/app/components/assessment/results/ResultsToolbar";
import { useRunResults } from "@/app/hooks/useRunResults";
import type {
  AssessmentMethodValue,
  ResultsViewMode,
} from "@/app/lib/types/assessment";
import {
  downloadCsv,
  jsonResultsToTableData,
} from "@/app/lib/assessment/results";

const SpreadsheetView = dynamic(
  () => import("@/app/components/assessment/SpreadsheetView"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-bg-primary">
        <Loader size="lg" message="Loading spreadsheet..." />
      </div>
    ),
  },
);

export default function AssessmentResultsPage() {
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<ResultsViewMode>("table");
  const [openRow, setOpenRow] = useState<number | null>(null);

  const assessmentId = params?.runId ?? "";
  const method =
    (searchParams.get("method") as AssessmentMethodValue | null) ?? "BATCH";
  const title = searchParams.get("title") ?? "Run results";
  const { results, headers, rows, isLoading, error } = useRunResults(
    assessmentId ? { assessment_id: assessmentId, method } : null,
  );

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-primary">
        <Loader size="lg" message="Loading results..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-bg-primary">
      <ResultsToolbar
        title={title}
        subtitle={`${rows.length} rows · ${headers.length} columns`}
        view={view}
        onViewChange={setView}
        onBack={() => router.push("/assessment")}
        onDownload={() => {
          // The table is capped for rendering; the CSV carries every row.
          const full = jsonResultsToTableData(results);
          downloadCsv(title, [full.headers, ...full.rows]);
        }}
      />

      {view === "table" ? (
        <>
          <p className="shrink-0 border-b border-border px-6 py-2 text-xs text-text-secondary">
            Click any row to open the full assessment — scores, reasons and the
            feedback in the submitter’s language.
          </p>
          <ResultsTable headers={headers} rows={rows} onRowClick={setOpenRow} />
        </>
      ) : (
        <SpreadsheetView
          runId={assessmentId}
          title={title}
          subtitle={`${rows.length} rows · ${headers.length} columns`}
          headers={headers}
          rows={rows}
        />
      )}

      <ResultRowModal
        row={openRow === null ? null : (results[openRow] ?? null)}
        onClose={() => setOpenRow(null)}
      />
    </div>
  );
}
