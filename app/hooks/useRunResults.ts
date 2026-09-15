"use client";

/**
 * One run's results, through the data source: the raw rows (for the detail
 * modal) plus the table projection the grids render.
 *
 * Polls while the run is in flight and stops at a terminal status, so an open
 * results tab fills in as stages land.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import {
  getAsyncErrorMessage,
  jsonResultsToTableData,
  normalizeStatus,
} from "@/app/lib/assessment/results";
import {
  RESULTS_POLL_INTERVAL_MS,
  SPREADSHEET_PREVIEW_ROW_LIMIT,
  TERMINAL_ASSESSMENT_STATUSES,
} from "@/app/lib/assessment/constants";
import type {
  AssessmentStatusValue,
  BatchCounts,
  ResultsTarget,
} from "@/app/lib/types/assessment";

export interface UseRunResultsResult {
  results: Record<string, unknown>[];
  headers: string[];
  rows: string[][];
  status: AssessmentStatusValue | null;
  counts: BatchCounts | null;
  totalItems: number;
  isPolling: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useRunResults(
  target: ResultsTarget | null,
): UseRunResultsResult {
  const toast = useToast();
  const data = useAssessmentData();
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [table, setTable] = useState<{ headers: string[]; rows: string[][] }>({
    headers: [],
    rows: [],
  });
  const [status, setStatus] = useState<AssessmentStatusValue | null>(null);
  const [counts, setCounts] = useState<BatchCounts | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const warnedRef = useRef(false);
  const cancelledRef = useRef(false);

  const assessmentId = target?.assessment_id ?? null;
  const method = target?.method ?? null;

  const load = useCallback(async () => {
    if (!assessmentId || !method) return;
    try {
      const payload = await data.getRunResults({
        assessment_id: assessmentId,
        method,
      });
      if (cancelledRef.current) return;

      setResults(payload.rows);
      setStatus(payload.status);
      setCounts(payload.counts);
      setTotalItems(payload.total_items);
      setTable(
        jsonResultsToTableData(payload.rows, {
          rowLimit: SPREADSHEET_PREVIEW_ROW_LIMIT,
        }),
      );
      setError(null);

      if (
        payload.rows.length > SPREADSHEET_PREVIEW_ROW_LIMIT &&
        !warnedRef.current
      ) {
        warnedRef.current = true;
        toast.warning(
          `Preview capped at ${SPREADSHEET_PREVIEW_ROW_LIMIT} rows. Download CSV for full data.`,
        );
      }
    } catch (caught) {
      if (!cancelledRef.current) {
        setError(getAsyncErrorMessage("load results", caught));
      }
    } finally {
      if (!cancelledRef.current) setIsLoading(false);
    }
  }, [assessmentId, data, method, toast]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!assessmentId) {
      setError("Invalid assessment id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void load();
    return () => {
      cancelledRef.current = true;
    };
  }, [assessmentId, load]);

  const isPolling =
    status !== null &&
    !TERMINAL_ASSESSMENT_STATUSES.has(normalizeStatus(status));

  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => void load(), RESULTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPolling, load]);

  return {
    results,
    headers: table.headers,
    rows: table.rows,
    status,
    counts,
    totalItems,
    isPolling,
    isLoading,
    error,
  };
}
