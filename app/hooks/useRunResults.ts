"use client";

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

/** A fetched extra plus the id it was fetched for, so a stale one is spottable. */
interface OwnedBy<T> {
  owner: string;
  value: T;
}

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
  const [inputs, setInputs] = useState<OwnedBy<SubmissionInputs> | null>(null);
  const [outputSchema, setOutputSchema] = useState<OwnedBy<Record<
    string,
    unknown
  > | null> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const warnedRef = useRef(false);
  const targetRef = useRef<string | null>(null);

  const assessmentId = target?.assessment_id ?? null;
  const method = target?.method ?? null;
  const targetKey = assessmentId && method ? `${assessmentId}:${method}` : null;
  const configKey = config ? `${config.id}@${config.version}` : null;

  const load = useCallback(async () => {
    if (!assessmentId || !method) return;
    const startedFor = `${assessmentId}:${method}`;
    const isStale = () => targetRef.current !== startedFor;
    try {
      const payload = await data.getRunResults({
        assessment_id: assessmentId,
        method,
      });
      if (isStale()) return;

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
      if (!isStale()) setError(getAsyncErrorMessage("load results", caught));
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [assessmentId, data, method, toast]);

  useEffect(() => {
    if (!assessmentId || !targetKey) {
      setError("Invalid assessment id.");
      setIsLoading(false);
      return;
    }

    targetRef.current = targetKey;
    // The previous run's rows are not this run's; show nothing until it loads.
    setResults([]);
    setStatus(null);
    setCounts(null);
    setTotalItems(0);
    setSubmissionId(null);
    setConfig(null);
    warnedRef.current = false;
    setIsLoading(true);
    void load();

    return () => {
      targetRef.current = null;
    };
  }, [assessmentId, load, targetKey]);

  // The source rows, once per submission. Immutable, so polling never refetches.
  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;

    void loadSubmissionInputs(data, submissionId, totalItems)
      .then((loaded) => {
        if (!cancelled && loaded.records.length > 0) {
          setInputs({ owner: submissionId, value: loaded });
        }
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
    if (!config?.id || !configKey) return;
    let cancelled = false;

    void data
      .getAssessorVersion(config.id, config.version)
      .then((version) => {
        if (!cancelled) {
          setOutputSchema({ owner: configKey, value: version.output_schema });
        }
      })
      .catch(() => {
        // Without a schema the columns keep their discovered order.
      });

    return () => {
      cancelled = true;
    };
  }, [config?.id, config?.version, configKey, data]);

  // A fetch that outlived its run must not colour the next one.
  const ownInputs =
    inputs && inputs.owner === submissionId ? inputs.value : null;
  const ownSchema =
    outputSchema && outputSchema.owner === configKey
      ? outputSchema.value
      : null;

  const joined = useMemo(
    () => (ownInputs ? mergeSubmissionInputs(results, ownInputs) : results),
    [ownInputs, results],
  );

  const table = useMemo(
    () =>
      jsonResultsToTableData(joined, {
        rowLimit: SPREADSHEET_PREVIEW_ROW_LIMIT,
        columnOrder: buildColumnOrder(ownInputs?.headers ?? [], ownSchema),
      }),
    [joined, ownInputs, ownSchema],
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
