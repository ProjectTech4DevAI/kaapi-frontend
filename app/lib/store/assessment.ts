// Zustand store for the selected assessment dataset: id + name only. A dataset
// is chosen in the Experiment tab to run a config against; the config itself is
// authored dataset-independently, so no columns/mapping live here.
import { create } from "zustand";
import type { AssessmentDatasetState } from "@/app/lib/types/assessment";

export const useAssessmentDatasetStore = create<AssessmentDatasetState>()(
  (set) => ({
    datasetId: "",
    datasetName: "",

    setDatasetId: (id) => set({ datasetId: id }),
    setDatasetName: (name) => set({ datasetName: name }),

    clearDataset: () =>
      set({
        datasetId: "",
        datasetName: "",
      }),
  }),
);
