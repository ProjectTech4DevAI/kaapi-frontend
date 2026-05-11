import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/components/Toast";
import { apiFetch } from "@/app/lib/apiClient";
import {
  Dataset,
  STTRun,
  STTResult,
  STTResultRaw,
  Language,
  DEFAULT_LANGUAGES,
  RawLanguage,
  LanguagesResponse,
  DatasetsResponse,
  RunsResponse,
  RunDetailResponse,
} from "@/app/lib/types/speechToText";

interface UseSttDataResult {
  languages: Language[];
  datasets: Dataset[];
  runs: STTRun[];
  results: STTResult[];
  selectedRunId: number | null;
  setSelectedRunId: (id: number | null) => void;
  setResults: React.Dispatch<React.SetStateAction<STTResult[]>>;
  isLoadingDatasets: boolean;
  isLoadingRuns: boolean;
  isLoadingResults: boolean;
  loadDatasets: () => Promise<void>;
  loadRuns: () => Promise<void>;
  loadResults: (runId: number) => Promise<void>;
}

/**
 * Owns the read-side state for the speech-to-text page: the list of
 * languages, datasets, runs, and the currently-loaded results, plus the
 * loaders that populate them. The page passes the active tab so we only
 * fetch runs when it's relevant.
 */
export function useSttData(
  activeTab: "datasets" | "evaluations",
): UseSttDataResult {
  const toast = useToast();
  const { apiKeys, isAuthenticated } = useAuth();
  const apiKey = apiKeys[0]?.key ?? "";

  const [languages, setLanguages] = useState<Language[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [runs, setRuns] = useState<STTRun[]>([]);
  const [results, setResults] = useState<STTResult[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  const loadLanguages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiFetch<RawLanguage[] | LanguagesResponse>(
        "/api/languages",
        apiKey,
      );

      let rawList: RawLanguage[] = [];
      if (Array.isArray(data)) {
        rawList = data;
      } else if (
        data.data &&
        !Array.isArray(data.data) &&
        Array.isArray(data.data.data)
      ) {
        rawList = data.data.data;
      } else if (data.data && Array.isArray(data.data)) {
        rawList = data.data;
      } else if (data.languages && Array.isArray(data.languages)) {
        rawList = data.languages;
      }

      const list: Language[] = rawList
        .filter((l) => l.is_active !== false)
        .map((l) => ({
          id: l.id,
          code: l.locale || l.code || "",
          name: l.label || l.name || "",
        }));

      setLanguages(list.length > 0 ? list : DEFAULT_LANGUAGES);
    } catch (error) {
      console.error("Failed to load languages:", error);
      setLanguages(DEFAULT_LANGUAGES);
    }
  }, [apiKey, isAuthenticated]);

  const loadDatasets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingDatasets(true);
    try {
      const data = await apiFetch<Dataset[] | DatasetsResponse>(
        "/api/evaluations/stt/datasets",
        apiKey,
      );
      let list: Dataset[] = [];
      if (Array.isArray(data)) list = data;
      else if (data.datasets && Array.isArray(data.datasets))
        list = data.datasets;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      setDatasets(list);
    } catch (error) {
      console.error("Failed to load datasets:", error);
      toast.error("Failed to load datasets");
      setDatasets([]);
    } finally {
      setIsLoadingDatasets(false);
    }
  }, [apiKey, isAuthenticated, toast]);

  const loadRuns = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingRuns(true);
    try {
      const data = await apiFetch<STTRun[] | RunsResponse>(
        "/api/evaluations/stt/runs",
        apiKey,
      );
      let list: STTRun[] = [];
      if (Array.isArray(data)) list = data;
      else if (data.runs && Array.isArray(data.runs)) list = data.runs;
      else if (data.data && Array.isArray(data.data)) list = data.data;
      setRuns(list);
    } catch (error) {
      console.error("Failed to load runs:", error);
      toast.error("Failed to load evaluation runs");
      setRuns([]);
    } finally {
      setIsLoadingRuns(false);
    }
  }, [apiKey, isAuthenticated, toast]);

  const loadResults = useCallback(
    async (runId: number) => {
      if (!isAuthenticated) return;
      setIsLoadingResults(true);
      try {
        const runData = await apiFetch<STTResultRaw[] | RunDetailResponse>(
          `/api/evaluations/stt/runs/${runId}?include_results=true&include_signed_url=true`,
          apiKey,
        );

        let rawResults: STTResultRaw[] = [];
        if (Array.isArray(runData)) {
          rawResults = runData;
        } else if (runData.results && Array.isArray(runData.results)) {
          rawResults = runData.results;
        } else if (runData.data && Array.isArray(runData.data)) {
          rawResults = runData.data as STTResultRaw[];
        } else if (
          runData.data &&
          !Array.isArray(runData.data) &&
          runData.data.results &&
          Array.isArray(runData.data.results)
        ) {
          rawResults = runData.data.results;
        }

        const list: STTResult[] = rawResults.map((result) => {
          const sample = result.sample;
          return {
            ...result,
            sampleName:
              sample?.sample_metadata?.original_filename ||
              `Sample ${result.stt_sample_id}`,
            groundTruth: sample?.ground_truth || "",
            fileId: sample?.file_id,
            signedUrl: sample?.signed_url || "",
          };
        });

        setResults(list);
        setSelectedRunId(runId);
      } catch (error) {
        console.error("Failed to load results:", error);
        toast.error("Failed to load evaluation results");
        setResults([]);
      } finally {
        setIsLoadingResults(false);
      }
    },
    [apiKey, isAuthenticated, toast],
  );

  useEffect(() => {
    loadLanguages();
    loadDatasets();
    if (activeTab === "evaluations") {
      loadRuns();
    }
  }, [apiKey, activeTab, loadLanguages, loadDatasets, loadRuns]);

  return {
    languages,
    datasets,
    runs,
    results,
    selectedRunId,
    setSelectedRunId,
    setResults,
    isLoadingDatasets,
    isLoadingRuns,
    isLoadingResults,
    loadDatasets,
    loadRuns,
    loadResults,
  };
}
