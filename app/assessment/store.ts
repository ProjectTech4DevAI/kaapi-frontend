import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ColumnMapping } from './types';

interface AssessmentDatasetState {
  datasetId: string;
  columns: string[];
  sampleRow: Record<string, string>;
  columnMapping: ColumnMapping;

  setDatasetId: (id: string) => void;
  setDataset: (datasetId: string, columns: string[], sampleRow: Record<string, string>) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  clearDataset: () => void;
}

const DEFAULT_MAPPING: ColumnMapping = { textColumns: [], attachments: [], groundTruthColumns: [] };

export const useAssessmentDatasetStore = create<AssessmentDatasetState>()(
  persist(
    (set) => ({
      datasetId: '',
      columns: [],
      sampleRow: {},
      columnMapping: DEFAULT_MAPPING,

      setDatasetId: (id) => set({ datasetId: id }),

      setDataset: (datasetId, columns, sampleRow) =>
        set({ datasetId, columns, sampleRow, columnMapping: DEFAULT_MAPPING }),

      setColumnMapping: (mapping) => set({ columnMapping: mapping }),

      clearDataset: () =>
        set({ datasetId: '', columns: [], sampleRow: {}, columnMapping: DEFAULT_MAPPING }),
    }),
    {
      name: 'assessment-dataset', // persists to localStorage
    }
  )
);
