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
      className={`${LEFT_PANEL_CLASSES} flex min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white`}
    >
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            Create New Dataset
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Upload a CSV file for evaluation
          </p>
        </div>

        <div>
          <label
            htmlFor="dataset-name"
            className="mb-1.5 block text-xs font-medium text-neutral-500"
          >
            Name *
          </label>
          <input
            id="dataset-name"
            type="text"
            value={datasetName}
            onChange={(event) => onDatasetNameChange(event.target.value)}
            placeholder="e.g., Hindi QnA Dataset"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
          />
        </div>

        <div>
          <label
            htmlFor="dataset-description"
            className="mb-1.5 block text-xs font-medium text-neutral-500"
          >
            Description
          </label>
          <input
            id="dataset-description"
            type="text"
            value={datasetDescription}
            onChange={(event) => onDatasetDescriptionChange(event.target.value)}
            placeholder="Optional description"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">
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
            <div className="rounded-lg bg-neutral-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onRemoveFile}
                  aria-label="Remove file"
                  className="rounded p-1 text-neutral-500"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragging
                  ? "border-neutral-900 bg-blue-50/30"
                  : "border-neutral-200"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <span className="mx-auto mb-2 block text-neutral-200">
                <CloudUploadIcon className="h-8 w-8" />
              </span>
              <p className="mb-1 text-sm font-medium text-neutral-900">
                Drop file here, or click to browse
              </p>
              <p className="text-xs text-neutral-500">
                CSV or Excel (.xlsx, .xls)
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-neutral-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={onResetForm}
          className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onCreateDataset}
          disabled={!uploadedFile || !datasetName.trim() || isUploading}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium ${
            !uploadedFile || !datasetName.trim() || isUploading
              ? "cursor-not-allowed bg-neutral-50 text-neutral-500"
              : "cursor-pointer bg-neutral-900 text-white"
          }`}
        >
          {isUploading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
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
