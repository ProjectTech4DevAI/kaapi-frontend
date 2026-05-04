"use client";

import { Button, Field } from "@/app/components";
import { CheckIcon, CloseIcon, CloudUploadIcon } from "@/app/components/icons";
import { DATASET_LEFT_PANEL_CLASSES } from "@/app/lib/assessment/constants";
import type { ChangeEvent, DragEvent, RefObject } from "react";
import type { ValueSetter } from "@/app/lib/types/assessment";

interface DatasetsCreatePanelProps {
  datasetName: string;
  datasetDescription: string;
  uploadedFile: File | null;
  isDragging: boolean;
  isUploading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDatasetNameChange: ValueSetter<string>;
  onDatasetDescriptionChange: ValueSetter<string>;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onRemoveFile: () => void;
  onResetForm: () => void;
  onCreateDataset: () => void;
}

export default function CreatePanel({
  datasetName,
  datasetDescription,
  uploadedFile,
  isDragging,
  isUploading,
  fileInputRef,
  onDatasetNameChange,
  onDatasetDescriptionChange,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemoveFile,
  onResetForm,
  onCreateDataset,
}: DatasetsCreatePanelProps) {
  return (
    <div
      className={`${DATASET_LEFT_PANEL_CLASSES} flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-bg-primary`}
    >
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Create New Dataset
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Upload a CSV file for evaluation
          </p>
        </div>

        <Field
          label="Name *"
          value={datasetName}
          onChange={onDatasetNameChange}
          placeholder="e.g., Hindi QnA Dataset"
          className="!rounded-md !bg-bg-primary"
        />

        <Field
          label="Description"
          value={datasetDescription}
          onChange={onDatasetDescriptionChange}
          placeholder="Optional description"
          className="!rounded-md !bg-bg-primary"
        />
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Upload CSV *
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileSelect}
            className="hidden"
          />

          {uploadedFile ? (
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckIcon className="h-4 w-4 flex-shrink-0 text-status-success" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemoveFile}
                  aria-label="Remove file"
                  className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-accent-primary bg-accent-subtle/20"
                  : "border-border"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <span className="mx-auto mb-2 block text-border">
                <CloudUploadIcon className="h-8 w-8" />
              </span>
              <p className="mb-1 text-sm font-medium text-text-primary">
                Drop file here, or click to browse
              </p>
              <p className="text-xs text-text-secondary">
                CSV or Excel (.xlsx, .xls)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-border bg-bg-primary px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onResetForm}
          className="!rounded-lg"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onCreateDataset}
          disabled={!uploadedFile || !datasetName.trim() || isUploading}
          className="!rounded-lg"
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
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
