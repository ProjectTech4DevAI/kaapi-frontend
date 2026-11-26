"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader } from "@/app/components/ui";
import ResultsToolbar from "@/app/components/assessment/results/ResultsToolbar";
import { useRunResults } from "@/app/hooks";
import type { AssessmentMethodValue } from "@/app/lib/types/assessment";
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

  const assessmentId = params.runId;
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
        onBack={() => router.push("/assessment")}
        onDownload={() => {
          const full = jsonResultsToTableData(results);
          downloadCsv(title, [full.headers, ...full.rows]);
        }}
      />

      <SpreadsheetView runId={assessmentId} headers={headers} rows={rows} />
    </div>
  );
}
