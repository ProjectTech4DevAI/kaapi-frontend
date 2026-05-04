"use client";

import { Dataset } from "@/app/lib/types/dataset";
import { Button, Field } from "@/app/components";
import Select from "@/app/components/Select";
import { CheckCircleIcon, PlayIcon } from "@/app/components/icons";
import ConfigSelector from "@/app/components/ConfigSelector";
import EvalDatasetDescription from "./EvalDatasetDescription";
import { Tab } from "@/app/lib/types/evaluation";

interface RunEvaluationFormProps {
  storedDatasets: Dataset[];
  selectedDataset?: Dataset;
  selectedDatasetId: string;
  setSelectedDatasetId: (id: string) => void;
  selectedConfigId: string;
  selectedConfigVersion: number;
  onConfigSelect: (configId: string, configVersion: number) => void;
  experimentName: string;
  setExperimentName: (name: string) => void;
  isEvaluating: boolean;
  canRun: boolean;
  onRun: () => void;
  setActiveTab: (tab: Tab) => void;
}

export default function RunEvaluationForm({
  storedDatasets,
  selectedDataset,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedConfigId,
  selectedConfigVersion,
  onConfigSelect,
  experimentName,
  setExperimentName,
  isEvaluating,
  canRun,
  onRun,
  setActiveTab,
}: RunEvaluationFormProps) {
  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Run New Evaluation
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Test model responses against your golden datasets
        </p>
      </div>

      <Field
        label="Name *"
        value={experimentName}
        onChange={setExperimentName}
        placeholder="e.g., test_run_1"
        disabled={isEvaluating}
      />

      <ConfigSelector
        selectedConfigId={selectedConfigId}
        selectedVersion={selectedConfigVersion}
        onConfigSelect={onConfigSelect}
        disabled={isEvaluating}
        compact
        datasetId={selectedDatasetId}
        experimentName={experimentName}
      />

      <div className="pt-2">
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Select Dataset *
        </label>
        {storedDatasets.length === 0 ? (
          <div className="border rounded-md p-8 text-center border-border">
            <p className="text-sm text-text-secondary">No datasets available</p>
            <p className="text-xs mt-1 text-text-secondary">
              Create a dataset first in the{" "}
              <button
                onClick={() => setActiveTab("datasets")}
                className="underline text-accent-primary cursor-pointer"
              >
                Datasets tab
              </button>
            </p>
          </div>
        ) : (
          <Select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            placeholder="-- Select a dataset --"
            options={storedDatasets.map((dataset) => ({
              value: String(dataset.dataset_id),
              label: `${dataset.dataset_name} (${dataset.total_items} items)`,
            }))}
          />
        )}
      </div>

      {selectedDataset && (
        <div className="border rounded-lg p-3 border-status-success bg-green-600/2">
          <div className="flex items-start gap-2">
            <CheckCircleIcon className="w-5 h-5 shrink-0 mt-0.5 text-status-success" />
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary">
                {selectedDataset.dataset_name}
              </div>
              {selectedDataset.description && (
                <EvalDatasetDescription
                  description={selectedDataset.description}
                />
              )}
              <div className="text-xs mt-1 text-text-secondary">
                {selectedDataset.total_items} items · x
                {selectedDataset.duplication_factor} duplication
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onRun}
          disabled={!canRun}
        >
          {isEvaluating ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Running Evaluation...
            </>
          ) : (
            <>
              <PlayIcon className="w-5 h-5" />
              Run Evaluation
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
