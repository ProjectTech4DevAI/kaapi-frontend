"use client";

import { WarningIcon } from "@/app/components/icons";
import type { DatasetsDeleteModalProps } from "@/app/lib/types/assessment";

export default function DeleteModal({
  datasetName,
  isDeleting,
  onCancel,
  onConfirm,
}: DatasetsDeleteModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-bg-primary shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-status-error-bg">
              <span className="text-status-error">
                <WarningIcon className="w-5 h-5" />
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Delete dataset
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Are you sure you want to delete{" "}
                <strong className="text-text-primary">{datasetName}</strong>?
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border bg-transparent px-4 py-2 text-sm font-medium text-text-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className={`rounded-lg bg-status-error px-4 py-2 text-sm font-medium text-white ${
              isDeleting ? "opacity-50" : ""
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
