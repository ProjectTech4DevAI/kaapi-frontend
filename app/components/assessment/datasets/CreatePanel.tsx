"use client";

import { CheckIcon, CloseIcon, CloudUploadIcon } from "@/app/components/icons";
import type { DatasetsCreatePanelProps } from "@/app/lib/types/assessment";
import { LEFT_PANEL_CLASSES } from "./utils";

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
      className={`${LEFT_PANEL_CLASSES} flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-bg-primary`}
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

        <div>
          <label
            htmlFor="dataset-name"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Name *
          </label>
          <input
            id="dataset-name"
            type="text"
            value={datasetName}
            onChange={(event) => onDatasetNameChange(event.target.value)}
            placeholder="e.g., Hindi QnA Dataset"
            className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>

        <div>
          <label
            htmlFor="dataset-description"
            className="mb-1.5 block text-xs font-medium text-text-secondary"
          >
            Description
          </label>
          <input
            id="dataset-description"
            type="text"
            value={datasetDescription}
            onChange={(event) => onDatasetDescriptionChange(event.target.value)}
            placeholder="Optional description"
            className="w-full rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>

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
                  className="rounded p-1 text-text-secondary"
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
        <button
          type="button"
          onClick={onResetForm}
          className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onCreateDataset}
          disabled={!uploadedFile || !datasetName.trim() || isUploading}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium ${
            !uploadedFile || !datasetName.trim() || isUploading
              ? "cursor-not-allowed bg-neutral-200 text-text-secondary"
              : "cursor-pointer bg-accent-primary text-white hover:bg-accent-hover"
          }`}
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
              Creating...
            </>
          ) : (
            "Create Dataset"
          )}
        </button>
      </div>
    </div>
  );
}
