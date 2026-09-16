"use client";

/**
 * View state for Assessment Home. The version selection is the pivot: it enables
 * Edit, reveals New run, and filters the runs panel. Loading lives in
 * useAssessmentHomeData.
 */
import { useCallback, useMemo, useState } from "react";
import { useAssessmentHomeData } from "@/app/hooks/useAssessmentHomeData";
import {
  buildHomeRunRows,
  buildRunFilterOptions,
  matchesRunFilter,
  versionFilterValue,
} from "@/app/lib/assessment/home";
import { RUNS_PER_PAGE } from "@/app/lib/assessment/constants";
import { paginate } from "@/app/lib/utils/assessment";
import {
  RUN_FILTER_ALL,
  type AssessorSelection,
  type RunFilterValue,
  type UseAssessmentHomeResult,
} from "@/app/lib/types/assessment";

export function useAssessmentHome(
  initialSelection: AssessorSelection | null = null,
): UseAssessmentHomeResult {
  const source = useAssessmentHomeData();
  const [selection, setSelection] = useState<AssessorSelection | null>(
    initialSelection,
  );
  const [expandedAssessorIds, setExpandedAssessorIds] = useState<Set<string>>(
    new Set(),
  );
  const [runPage, setRunPage] = useState(1);
  const [runFilter, setRunFilter] = useState<RunFilterValue>(
    initialSelection
      ? versionFilterValue(initialSelection.configId, initialSelection.version)
      : RUN_FILTER_ALL,
  );

  const {
    assessors,
    knownAssessors,
    assessments,
    versionsByAssessor,
    loadVersions,
  } = source;

  const applySelection = useCallback((next: AssessorSelection | null) => {
    setSelection(next);
    setRunFilter(
      next ? versionFilterValue(next.configId, next.version) : RUN_FILTER_ALL,
    );
    setRunPage(1);
  }, []);

  // Selecting an assessor means its latest version, which is one fetch away.
  const selectAssessor = useCallback(
    (configId: string) => {
      if (selection?.configId === configId) {
        applySelection(null);
        return;
      }
      const known = versionsByAssessor[configId];
      const resolve = known ? Promise.resolve(known) : loadVersions(configId);
      void resolve.then((versions) => {
        const latest = versions[0]?.version;
        if (latest) applySelection({ configId, version: latest });
      });
    },
    [applySelection, loadVersions, selection, versionsByAssessor],
  );

  // A deleted assessor or version must not stay selected — Edit would 404.
  const deleteAssessor = useCallback(
    async (configId: string) => {
      await source.deleteAssessor(configId);
      if (selection?.configId === configId) applySelection(null);
    },
    [applySelection, selection, source],
  );

  const deleteAssessorVersion = useCallback(
    async (configId: string, version: number) => {
      await source.deleteAssessorVersion(configId, version);
      if (selection?.configId === configId && selection.version === version) {
        applySelection(null);
      }
    },
    [applySelection, selection, source],
  );

  const selectVersion = useCallback(
    (configId: string, version: number) => {
      const isSelected =
        selection?.configId === configId && selection.version === version;
      applySelection(isSelected ? null : { configId, version });
    },
    [applySelection, selection],
  );

  const toggleAssessorExpanded = useCallback(
    (configId: string) => {
      setExpandedAssessorIds((current) => {
        const next = new Set(current);
        if (next.has(configId)) next.delete(configId);
        else next.add(configId);
        return next;
      });
      if (!versionsByAssessor[configId]) loadVersions(configId);
    },
    [loadVersions, versionsByAssessor],
  );

  const changeRunFilter = useCallback((value: RunFilterValue) => {
    setRunFilter(value);
    setRunPage(1);
  }, []);

  // Newest run first; the source list arrives oldest-first from the API.
  // Named off every assessor seen so far, not just the page on screen.
  const runSlice = useMemo(() => {
    const rows = buildHomeRunRows(assessments, knownAssessors)
      .reverse()
      .filter((row) => matchesRunFilter(row, runFilter));
    return paginate(rows, runPage, RUNS_PER_PAGE);
  }, [assessments, knownAssessors, runFilter, runPage]);

  const runFilterOptions = useMemo(
    () => buildRunFilterOptions(knownAssessors, assessments),
    [assessments, knownAssessors],
  );

  return {
    isLoading: source.isLoading,
    error: source.error,
    refresh: source.refresh,
    assessors,
    hasPrevAssessors: source.hasPrevAssessors,
    hasNextAssessors: source.hasNextAssessors,
    showPrevAssessors: source.showPrevAssessors,
    showNextAssessors: source.showNextAssessors,
    assessorSearch: source.assessorSearch,
    setAssessorSearch: source.setAssessorSearch,
    expandedAssessorIds,
    toggleAssessorExpanded,
    versionsByAssessor,
    selection,
    selectAssessor,
    selectVersion,
    deleteAssessor,
    deleteAssessorVersion,
    deletingKey: source.deletingKey,
    runSlice,
    runFilter,
    setRunFilter: changeRunFilter,
    runFilterOptions,
    gotoRunPage: setRunPage,
  };
}
