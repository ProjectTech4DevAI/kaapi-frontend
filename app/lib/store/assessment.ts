import { create } from "zustand";
import type { ColumnMapping } from "@/app/lib/types/assessment";

interface AssessmentDatasetState {
  datasetId: string;
  datasetName: string;
  columns: string[];
  sampleRow: Record<string, string>;
  columnMapping: ColumnMapping;

  setDatasetId: (id: string) => void;
  setDatasetName: (name: string) => void;
  setDataset: (
    datasetId: string,
    columns: string[],
    sampleRow: Record<string, string>,
    datasetName?: string,
  ) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  clearDataset: () => void;
}

const DEFAULT_MAPPING: ColumnMapping = {
  textColumns: [],
  attachments: [],
  groundTruthColumns: [],
};

export const useAssessmentDatasetStore = create<AssessmentDatasetState>()(
  (set) => ({
    datasetId: "",
    datasetName: "",
    columns: [],
    sampleRow: {},
    columnMapping: DEFAULT_MAPPING,

    setDatasetId: (id) => set({ datasetId: id }),
    setDatasetName: (name) => set({ datasetName: name }),

    setDataset: (datasetId, columns, sampleRow, datasetName) =>
      set((state) => ({
        datasetId,
        datasetName: datasetName ?? state.datasetName,
        columns,
        sampleRow,
        columnMapping:
          datasetId !== state.datasetId ? DEFAULT_MAPPING : state.columnMapping,
      })),

    setColumnMapping: (mapping) => set({ columnMapping: mapping }),

    clearDataset: () =>
      set({
        datasetId: "",
        datasetName: "",
        columns: [],
        sampleRow: {},
        columnMapping: DEFAULT_MAPPING,
      }),
  }),
);
