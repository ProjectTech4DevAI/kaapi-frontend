"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/apiClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { useToast } from "@/app/hooks/useToast";
import { fetchDatasetPreview } from "@/app/lib/utils/assessment";
import type { Dataset } from "@/app/lib/types/dataset";
import type { DatasetResponse, SampleRow } from "@/app/lib/types/assessment";

export interface ReferenceDataset {
  id: string;
  name: string;
  headers: string[];
  sampleRow: SampleRow;
}

export interface UseReferenceDatasetResult {
  datasets: Dataset[];
  isLoadingDatasets: boolean;
  referenceDataset: ReferenceDataset | null;
  isLoadingReference: boolean;
  selectReferenceDataset: (id: string) => Promise<void>;
}

// Optional reference dataset for the config editor: its headers feed the
// @-mention list and a sample row feeds previews/type suggestions. The config
// itself stays dataset-independent — nothing here is persisted in the blob.
export function useReferenceDataset(): UseReferenceDatasetResult {
  const toast = useToast();
  const { activeKey, isAuthenticated } = useAuth();
  const apiKey = activeKey?.key ?? "";

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [referenceDataset, setReferenceDataset] =
    useState<ReferenceDataset | null>(null);
  const [isLoadingReference, setIsLoadingReference] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoadingDatasets(true);
    apiFetch<DatasetResponse>("/api/assessment/datasets", apiKey)
      .then((data) => {
        if (cancelled) return;
        setDatasets(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => {
        // Non-fatal: the editor works without a reference dataset.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDatasets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, isAuthenticated]);

  const selectReferenceDataset = useCallback(
    async (id: string) => {
      if (!id) {
        setReferenceDataset(null);
        return;
      }
      const dataset = datasets.find((d) => d.dataset_id.toString() === id);
      setIsLoadingReference(true);
      try {
        const preview = await fetchDatasetPreview(id, apiKey, 1);
        const headers = preview.headers.filter((col) => col.trim() !== "");
        const firstRow = preview.rows[0] ?? [];
        const sampleRow: SampleRow = {};
        preview.headers.forEach((header, index) => {
          if (header.trim()) sampleRow[header] = firstRow[index] ?? "";
        });
        setReferenceDataset({
          id,
          name: dataset?.dataset_name ?? id,
          headers,
          sampleRow,
        });
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load dataset columns",
        );
      } finally {
        setIsLoadingReference(false);
      }
    },
    [apiKey, datasets, toast],
  );

  return {
    datasets,
    isLoadingDatasets,
    referenceDataset,
    isLoadingReference,
    selectReferenceDataset,
  };
}
