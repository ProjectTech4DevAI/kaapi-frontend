"use client";

import { Button, Field } from "@/app/components/ui";
import { CheckIcon, CloseIcon, CloudUploadIcon } from "@/app/components/icons";
import { SUBMISSION_FORM_PANEL_CLASSES } from "@/app/lib/assessment/constants";
import type { CreatePanelProps } from "@/app/lib/types/assessment";

const LAYOUT_CLASSES: Record<"panel" | "inline", string> = {
  panel: `${SUBMISSION_FORM_PANEL_CLASSES} shrink-0 border-l border-border bg-bg-primary`,
  inline: "w-full bg-transparent",
};

export default function CreatePanel({
  form,
  isCreating,
  onCreate,
  layout = "panel",
  onCancel,
}: CreatePanelProps) {
  const { file, fileInputRef } = form;

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden ${LAYOUT_CLASSES[layout]}`}
    >
      <div
        className={`flex-1 space-y-4 overflow-auto ${layout === "panel" ? "p-4" : "p-0"}`}
      >
        {layout === "panel" && (
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Create New Submission
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Upload a CSV file for assessment
            </p>
          </div>
        )}

        <Field
          label="Name *"
          value={form.name}
          onChange={form.setName}
          placeholder="e.g., SIM Submissions"
          className="!rounded-md !bg-bg-primary"
        />

        <Field
          label="Description"
          value={form.description}
          onChange={form.setDescription}
          placeholder="Optional description"
          className="!rounded-md !bg-bg-primary"
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Upload Submissions *
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={form.handleFileSelect}
            className="hidden"
          />

          {file ? (
            <div className="rounded-lg bg-bg-secondary p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckIcon className="h-4 w-4 shrink-0 text-status-success" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {file.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={form.removeFile}
                  aria-label="Remove file"
                  className="cursor-pointer rounded p-1 text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => {
                if (event.dataTransfer.types.includes("Files")) {
                  form.setIsDragging(true);
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(event.relatedTarget as Node)
                ) {
                  form.setIsDragging(false);
                }
              }}
              onDrop={form.handleDrop}
              className={`w-full cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                form.isDragging
                  ? "border-accent-primary bg-accent-subtle/20"
                  : "border-border hover:border-accent-muted"
              }`}
            >
              <span className="mx-auto mb-2 flex justify-center text-border">
                <CloudUploadIcon className="h-8 w-8" />
              </span>
              <p className="mb-1 text-sm font-medium text-text-primary">
                Drop file here, or click to browse
              </p>
              <p className="text-xs text-text-secondary">
                CSV or Excel (.xlsx, .xls)
              </p>
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              form.reset();
              onCancel?.();
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCreate}
            disabled={!file || !form.name.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-transparent" />
                Creating...
              </>
            ) : (
              "Create Submission"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
