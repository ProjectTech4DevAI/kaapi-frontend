"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Loader from "@/app/components/Loader";
import { useToast } from "@/app/components/Toast";
import { useAuth } from "@/app/lib/context/AuthContext";
import { apiFetch } from "@/app/lib/apiClient";
import { jsonResultsToTableData } from "@/app/lib/assessment/results";
import { SPREADSHEET_PREVIEW_ROW_LIMIT } from "@/app/lib/assessment/constants";

const SpreadsheetView = dynamic(
  () => import("@/app/components/assessment/SpreadsheetView"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-bg-primary">
        <Loader size="lg" message="Loading spreadsheet..." />
      </div>
    ),
  },
);

export default function AssessmentResultsPage() {
  const params = useParams<{ runId: string }>();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { apiKeys, isAuthenticated, isHydrated } = useAuth();
  const apiKey = apiKeys[0]?.key ?? "";

  const runId = Number(params?.runId);
  const title = searchParams.get("title") ?? `Run ${runId}`;

  const [headers, setHeaders] = useState<string[] | null>(null);
  const [rows, setRows] = useState<string[][] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      setError("You must be signed in to view this run.");
      return;
    }
    if (!Number.isFinite(runId) || runId <= 0) {
      setError("Invalid run id.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const json = await apiFetch<
          { data?: Record<string, unknown>[] } | Record<string, unknown>[]
        >(`/api/assessment/runs/${runId}/results?export_format=json`, apiKey);
        const results: Record<string, unknown>[] = Array.isArray(json)
          ? json
          : json.data || [];
        const table = jsonResultsToTableData(results, {
          rowLimit: SPREADSHEET_PREVIEW_ROW_LIMIT,
        });
        if (cancelled) return;
        if (results.length > SPREADSHEET_PREVIEW_ROW_LIMIT) {
          toast.warning(
            `Preview capped at ${SPREADSHEET_PREVIEW_ROW_LIMIT} rows. Download CSV for full data.`,
          );
        }
        setHeaders(table.headers);
        setRows(table.rows);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load results";
        setError(msg);
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, isAuthenticated, isHydrated, runId, toast]);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  if (!headers || !rows) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-bg-primary">
        <Loader size="lg" message="Loading results..." />
      </div>
    );
  }

  return (
    <SpreadsheetView
      runId={runId}
      title={title}
      subtitle={`${rows.length} rows · ${headers.length} columns`}
      headers={headers}
      rows={rows}
    />
  );
}
