import { create } from "zustand";
import type {
  AssessmentDatasetState,
  ColumnMapping,
} from "@/app/lib/types/assessment";

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
