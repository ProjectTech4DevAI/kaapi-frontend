"use client";

import { useEffect, useRef } from "react";
import { TextSample } from "@/app/lib/types/textToSpeech";
import { Language } from "@/app/lib/types/speechToText";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Button, Field } from "@/app/components/ui";
import Select from "@/app/components/ui/Select";
import { CloseIcon, PlusIcon } from "@/app/components/icons";

interface CreateTTSDatasetFormProps {
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  datasetLanguageId: number;
  setDatasetLanguageId: (id: number) => void;
  languages: Language[];
  textSamples: TextSample[];
  addTextSample: () => void;
  removeTextSample: (id: string) => void;
  updateSampleText: (id: string, text: string) => void;
  isCreating: boolean;
  handleCreateDataset: () => void;
  resetForm: () => void;
}

export default function CreateTTSDatasetForm({
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  datasetLanguageId,
  setDatasetLanguageId,
  languages,
  textSamples,
  addTextSample,
  removeTextSample,
  updateSampleText,
  isCreating,
  handleCreateDataset,
  resetForm,
}: CreateTTSDatasetFormProps) {
  const { isAuthenticated } = useAuth();
  const samplesContainerRef = useRef<HTMLDivElement>(null);
  const prevSamplesCount = useRef(textSamples.length);

  useEffect(() => {
    if (textSamples.length > prevSamplesCount.current) {
      setTimeout(() => {
        samplesContainerRef.current?.scrollTo({
          top: samplesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 50);
    }
    prevSamplesCount.current = textSamples.length;
  }, [textSamples.length]);

  const isCreateDisabled =
    isCreating ||
    !datasetName.trim() ||
    textSamples.filter((s) => s.text.trim()).length === 0;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Create New Dataset
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Add text samples for speech synthesis evaluation
        </p>
      </div>

      <Field
        label="Name *"
        value={datasetName}
        onChange={setDatasetName}
        placeholder="e.g., Hindi News Dataset"
      />

      <Field
        label="Description"
        value={datasetDescription}
        onChange={setDatasetDescription}
        placeholder="Optional description"
      />

      <div>
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Language *
        </label>
        <Select
          value={datasetLanguageId}
          onChange={(e) => setDatasetLanguageId(Number(e.target.value))}
          options={languages.map((lang) => ({
            value: String(lang.id),
            label: lang.name,
          }))}
        />
      </div>

      <div>
        <label className="text-xs font-medium mb-1.5 block text-text-secondary">
          Text Samples *
        </label>

        {textSamples.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center border-border">
            <p className="text-xs text-text-secondary">No samples added yet</p>
          </div>
        ) : (
          <div
            ref={samplesContainerRef}
            className="space-y-2 max-h-[300px] overflow-auto"
          >
            {textSamples.map((sample, idx) => (
              <div key={sample.id} className="flex gap-2">
                <textarea
                  value={sample.text}
                  onChange={(e) => updateSampleText(sample.id, e.target.value)}
                  placeholder={`Sample ${idx + 1}...`}
                  rows={2}
                  className="flex-1 px-3 py-2 border rounded-md text-sm bg-bg-primary border-border text-text-primary resize-y"
                />
                <button
                  onClick={() => removeTextSample(sample.id)}
                  className="p-1 rounded shrink-0 self-start mt-1.5 text-text-secondary cursor-pointer"
                  aria-label="Remove sample"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={isAuthenticated ? addTextSample : undefined}
          className={`flex items-center gap-1 text-xs font-medium mt-2 ${
            isAuthenticated
              ? "text-accent-primary cursor-pointer"
              : "text-text-secondary cursor-not-allowed"
          }`}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Sample
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="md" onClick={resetForm}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleCreateDataset}
          disabled={isCreateDisabled}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Dataset"
          )}
        </Button>
      </div>
    </div>
  );
}
