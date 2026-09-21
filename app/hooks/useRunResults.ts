"use client";

/**
 * One run's results, through the data source: the raw rows (for the detail
 * modal) plus the table projection the grids render.
 *
 * Polls while the run is in flight and stops at a terminal status, so an open
 * results tab fills in as stages land.
 *
 * The run payload only echoes the columns the config mapped, so the submission's
 * own rows are fetched alongside and joined on `row_index`. That fetch is
 * deliberately off the critical path: the grid paints on results alone and the
 * source columns appear when they land, so a slow or failed submission read
 * costs nothing but the extra columns.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import {
  getAsyncErrorMessage,
  jsonResultsToTableData,
  normalizeStatus,
} from "@/app/lib/assessment/results";
import {
  buildColumnOrder,
  mergeSubmissionInputs,
  type SubmissionInputs,
} from "@/app/lib/assessment/inputJoin";
import { loadSubmissionInputs } from "@/app/lib/assessment/submissionInputs";
import {
  RESULTS_POLL_INTERVAL_MS,
  SPREADSHEET_PREVIEW_ROW_LIMIT,
  TERMINAL_ASSESSMENT_STATUSES,
} from "@/app/lib/assessment/constants";
import type {
  AssessmentConfigRef,
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
  const [status, setStatus] = useState<AssessmentStatusValue | null>(null);
  const [counts, setCounts] = useState<BatchCounts | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [config, setConfig] = useState<AssessmentConfigRef | null>(null);
  const [inputs, setInputs] = useState<SubmissionInputs | null>(null);
  const [outputSchema, setOutputSchema] = useState<Record<
    string,
    unknown
  > | null>(null);
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
      setSubmissionId(payload.submission_id);
      setConfig(payload.config);
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

  // The source rows, once per submission. Immutable, so polling never refetches.
  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;

    void loadSubmissionInputs(data, submissionId, totalItems)
      .then((loaded) => {
        if (!cancelled && loaded.records.length > 0) setInputs(loaded);
      })
      .catch(() => {
        // Source columns are additive; without them the results still stand.
      });

    return () => {
      cancelled = true;
    };
  }, [data, submissionId, totalItems]);

  // The output schema fixes column order, so it follows the config, not the rows.
  useEffect(() => {
    if (!config?.id) return;
    let cancelled = false;

    void data
      .getAssessorVersion(config.id, config.version)
      .then((version) => {
        if (!cancelled) setOutputSchema(version.output_schema ?? null);
      })
      .catch(() => {
        // Without a schema the columns keep their discovered order.
      });

    return () => {
      cancelled = true;
    };
  }, [config?.id, config?.version, data]);

  const joined = useMemo(
    () => (inputs ? mergeSubmissionInputs(results, inputs) : results),
    [inputs, results],
  );

  const table = useMemo(
    () =>
      jsonResultsToTableData(joined, {
        rowLimit: SPREADSHEET_PREVIEW_ROW_LIMIT,
        columnOrder: buildColumnOrder(inputs?.headers ?? [], outputSchema),
      }),
    [inputs, joined, outputSchema],
  );

  const isPolling =
    status !== null &&
    !TERMINAL_ASSESSMENT_STATUSES.has(normalizeStatus(status));

  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(() => void load(), RESULTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPolling, load]);

  return {
    results: joined,
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
