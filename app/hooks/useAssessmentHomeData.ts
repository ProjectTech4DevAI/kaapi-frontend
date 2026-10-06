"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import { useAssessmentFeatureGuard } from "@/app/hooks/useAssessmentFeatureGuard";
import {
  ASSESSORS_PER_PAGE,
  ASSESSOR_SEARCH_DEBOUNCE_MS,
  RESULTS_POLL_INTERVAL_MS,
} from "@/app/lib/assessment/constants";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  AssessmentRun,
  AssessorSummary,
  AssessorVersion,
  UseAssessmentHomeDataResult,
} from "@/app/lib/types/assessment";

export function useAssessmentHomeData(): UseAssessmentHomeDataResult {
  const toast = useToast();
  const data = useAssessmentData();
  const { guard } = useAssessmentFeatureGuard();

  const [assessors, setAssessors] = useState<AssessorSummary[]>([]);
  const [assessorIndex, setAssessorIndex] = useState<
    Record<string, AssessorSummary>
  >({});
  const [assessorSkip, setAssessorSkip] = useState(0);
  const [hasNextAssessors, setHasNextAssessors] = useState(false);
  const [assessorSearch, setAssessorSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [assessments, setAssessments] = useState<AssessmentRun[]>([]);
  const [versionsByAssessor, setVersionsByAssessor] = useState<
    Record<string, AssessorVersion[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const loadAssessments = useCallback(async () => {
    try {
      const next = await data.listAssessments();
      if (!isMountedRef.current) return;
      setAssessments(next);
      setError(null);
    } catch (caught) {
      if (guard(caught)) return;
      if (isMountedRef.current) {
        setError(getAsyncErrorMessage("load assessments", caught));
      }
    }
  }, [data, guard]);

  const loadAssessors = useCallback(async () => {
    try {
      const page = await data.listAssessors({
        skip: assessorSkip,
        limit: ASSESSORS_PER_PAGE,
        search: searchTerm,
      });
      if (!isMountedRef.current) return;
      setAssessors(page.items);
      setHasNextAssessors(page.hasMore);
      setAssessorIndex((current) => ({
        ...current,
        ...Object.fromEntries(page.items.map((item) => [item.id, item])),
      }));
    } catch (caught) {
      if (guard(caught)) return;
      if (isMountedRef.current) {
        setError(getAsyncErrorMessage("load assessors", caught));
      }
    }
  }, [assessorSkip, data, guard, searchTerm]);

  const refresh = useCallback(async () => {
    await Promise.all([loadAssessors(), loadAssessments()]);
    if (isMountedRef.current) setIsLoading(false);
  }, [loadAssessments, loadAssessors]);

  const loadVersions = useCallback(
    async (configId: string) => {
      try {
        const versions = await data.listAssessorVersions(configId);
        if (isMountedRef.current) {
          setVersionsByAssessor((current) => ({
            ...current,
            [configId]: versions,
          }));
        }
        return versions;
      } catch (caught) {
        toast.error(getAsyncErrorMessage("load versions", caught));
        return [];
      }
    },
    [data, toast],
  );

  const deleteAssessor = useCallback(
    async (configId: string) => {
      setDeletingKey(configId);
      try {
        await data.deleteAssessor(configId);
        setVersionsByAssessor(({ [configId]: _dropped, ...rest }) => rest);
        setAssessorIndex(({ [configId]: _gone, ...rest }) => rest);
        await loadAssessors();
        toast.success("Assessor deleted");
      } catch (caught) {
        toast.error(getAsyncErrorMessage("delete assessor", caught));
      } finally {
        if (isMountedRef.current) setDeletingKey(null);
      }
    },
    [data, loadAssessors, toast],
  );

  const deleteAssessorVersion = useCallback(
    async (configId: string, version: number) => {
      setDeletingKey(`${configId}:v${version}`);
      try {
        await data.deleteAssessorVersion(configId, version);
        await loadVersions(configId);
        toast.success(`Version v${version} deleted`);
      } catch (caught) {
        toast.error(getAsyncErrorMessage("delete version", caught));
      } finally {
        if (isMountedRef.current) setDeletingKey(null);
      }
    },
    [data, loadVersions, toast],
  );

  const changeSearch = useCallback((value: string) => {
    setAssessorSearch(value);
    setAssessorSkip(0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => setSearchTerm(assessorSearch),
      ASSESSOR_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [assessorSearch]);

  useEffect(() => {
    void loadAssessors();
  }, [loadAssessors]);

  useEffect(() => {
    isMountedRef.current = true;
    void loadAssessments().finally(() => {
      if (isMountedRef.current) setIsLoading(false);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [loadAssessments]);

  useEffect(() => {
    const interval = setInterval(
      () => void loadAssessments(),
      RESULTS_POLL_INTERVAL_MS,
    );
    return () => clearInterval(interval);
  }, [loadAssessments]);

  return {
    assessors,
    knownAssessors: Object.values(assessorIndex),
    hasPrevAssessors: assessorSkip > 0,
    hasNextAssessors,
    showPrevAssessors: useCallback(
      () => setAssessorSkip((skip) => Math.max(0, skip - ASSESSORS_PER_PAGE)),
      [],
    ),
    showNextAssessors: useCallback(
      () => setAssessorSkip((skip) => skip + ASSESSORS_PER_PAGE),
      [],
    ),
    assessorSearch,
    setAssessorSearch: changeSearch,
    assessments,
    versionsByAssessor,
    loadVersions,
    deleteAssessor,
    deleteAssessorVersion,
    deletingKey,
    isLoading,
    error,
    refresh,
  };
}
