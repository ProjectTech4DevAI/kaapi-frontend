"use client";

import { TTSDataset, TTSModelVoice } from "@/app/lib/types/textToSpeech";
import {
  Button,
  Checkbox,
  Field,
  LoaderBox,
  Select,
} from "@/app/components/ui";
import { CheckCircleIcon, PlayIcon } from "@/app/components/icons";
import { TTS_MODELS } from "@/app/lib/data/ttsModels";

interface RunTTSEvaluationFormProps {
  evaluationName: string;
  setEvaluationName: (name: string) => void;
  datasets: TTSDataset[];
  isLoadingDatasets: boolean;
  selectedDatasetId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  selectedDataset: TTSDataset | undefined;
  selectedModels: TTSModelVoice[];
  setSelectedModels: (models: TTSModelVoice[]) => void;
  isRunning: boolean;
  handleRunEvaluation: () => void;
}

export default function RunTTSEvaluationForm({
  evaluationName,
  setEvaluationName,
  datasets,
  isLoadingDatasets,
  selectedDatasetId,
  setSelectedDatasetId,
  selectedDataset,
  selectedModels,
  setSelectedModels,
  isRunning,
  handleRunEvaluation,
}: RunTTSEvaluationFormProps) {
  const isRunDisabled =
    isRunning ||
    !evaluationName.trim() ||
    !selectedDatasetId ||
    selectedModels.length === 0;

  const toggleModel = (model: string, defaultVoice: string, on: boolean) =>
    setSelectedModels(
      on
        ? [...selectedModels, { model, voice: defaultVoice }]
        : selectedModels.filter((m) => m.model !== model),
    );

  const setVoice = (model: string, voice: string) =>
    setSelectedModels(
      selectedModels.map((m) => (m.model === model ? { ...m, voice } : m)),
    );

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Run New Evaluation
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Evaluate speech synthesis quality across TTS models
        </p>
      </div>

      <Field
        label="Name *"
        value={evaluationName}
        onChange={setEvaluationName}
        placeholder="e.g., Hindi TTS Evaluation v1"
      />

      <div>
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Models * (select one or more to compare)
        </label>
        <div className="space-y-2">
          {TTS_MODELS.map(({ model, voices, defaultVoice }) => {
            const selected = selectedModels.find((m) => m.model === model);
            return (
              <div
                key={model}
                className="flex items-center justify-between gap-3 border rounded-md px-3 py-2 border-border"
              >
                <Checkbox
                  checked={!!selected}
                  onChange={(on) => toggleModel(model, defaultVoice, on)}
                  label={model}
                />
                {selected && (
                  <div className="w-40 shrink-0">
                    <Select
                      value={selected.voice}
                      onChange={(e) => setVoice(model, e.target.value)}
                      options={voices.map((v) => ({ value: v, label: v }))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Select Dataset *
        </label>
        {isLoadingDatasets ? (
          <LoaderBox message="Loading datasets..." size="sm" />
        ) : datasets.length === 0 ? (
          <div className="border rounded-md p-8 text-center border-border">
            <p className="text-sm text-text-secondary">No datasets available</p>
            <p className="text-xs mt-1 text-text-secondary">
              Create a dataset first in the Datasets tab
            </p>
          </div>
        ) : (
          <Select
            value={selectedDatasetId || ""}
            onChange={(e) =>
              setSelectedDatasetId(
                e.target.value ? parseInt(e.target.value) : null,
              )
            }
            placeholder="-- Select a dataset --"
            options={datasets.map((dataset) => ({
              value: String(dataset.id),
              label: `${dataset.name} (${dataset.dataset_metadata?.sample_count || 0} samples)`,
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
                {selectedDataset.name}
              </div>
              <div className="text-xs mt-1 space-y-0.5 text-text-secondary">
                <div>
                  {selectedDataset.dataset_metadata?.sample_count || 0} samples
                </div>
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
          onClick={handleRunEvaluation}
          disabled={isRunDisabled}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Starting Evaluation...
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
