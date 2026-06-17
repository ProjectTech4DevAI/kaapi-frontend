"use client";

import { useRef, useState } from "react";
import { Button, Field, InfoTooltip, Select } from "@/app/components/ui";
import {
  CheckLineIcon,
  CloseIcon,
  CloudUploadIcon,
} from "@/app/components/icons";
import { MAX_NAME_LENGTH } from "@/app/lib/constants";

interface CreateDatasetFormProps {
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  duplicationFactor: string;
  setDuplicationFactor: (factor: string) => void;
  uploadedFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  isUploading: boolean;
  handleCreateDataset: () => void | Promise<boolean>;
  resetForm: () => void;
}

export default function CreateDatasetForm({
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  duplicationFactor,
  setDuplicationFactor,
  uploadedFile,
  onFileSelect,
  onRemoveFile,
  isUploading,
  handleCreateDataset,
  resetForm,
}: CreateDatasetFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(
          new Event("change", { bubbles: true }),
        );
      }
    }
  };

  const isCreateDisabled = !uploadedFile || !datasetName.trim() || isUploading;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Create New Dataset
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Upload a CSV with golden question-answer pairs
        </p>
      </div>

      <Field
        label="Name *"
        value={datasetName}
        onChange={setDatasetName}
        placeholder="e.g., QnA Dataset v1"
        maxLength={MAX_NAME_LENGTH}
      />

      <Field
        label="Description"
        value={datasetDescription}
        onChange={setDatasetDescription}
        placeholder="Optional description"
      />

      <div>
        <label className="text-xs font-medium mb-1.5 text-text-secondary">
          <span className="inline-flex items-center">
            Duplication Factor
            <InfoTooltip
              text={
                <>
                  Controls how many times each question is sent to the AI to
                  generate an answer. For example, setting this to 3 means the
                  AI answers each question 3 separate times — helpful for
                  checking if the AI gives consistent and reliable responses
                  each time.
                </>
              }
            />
          </span>
        </label>
        <Select
          value={duplicationFactor}
          onChange={(e) => setDuplicationFactor(e.target.value)}
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: String(n),
            label: String(n),
          }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Upload CSV *
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="hidden"
        />

        {uploadedFile ? (
          <div className="rounded-lg p-3 bg-bg-secondary overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <CheckLineIcon className="w-4 h-4 shrink-0 text-status-success" />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium text-text-primary truncate"
                    title={uploadedFile.name}
                  >
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onRemoveFile();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 rounded text-text-secondary cursor-pointer shrink-0"
                aria-label="Remove file"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-accent-primary bg-blue-50/30"
                : "border-border"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CloudUploadIcon className="mx-auto h-8 w-8 mb-2 text-border" />
            <p className="text-sm font-medium mb-1 text-text-primary">
              Drop CSV here, or click to browse
            </p>
            <p className="text-xs text-text-secondary">
              Format:{" "}
              <span className="font-mono text-text-primary">
                question,answer
              </span>{" "}
              <span className="text-text-secondary">
                (optional: <span className="font-mono">category</span>)
              </span>
            </p>
          </div>
        )}
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
          {isUploading ? (
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
