"use client";

import { Button, Modal } from "@/app/components";
import { WarningIcon } from "@/app/components/icons";
import type { DatasetsDeleteModalProps } from "@/app/lib/types/assessment";

export default function DeleteModal({
  datasetName,
  isDeleting,
  onCancel,
  onConfirm,
}: DatasetsDeleteModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      maxWidth="max-w-md"
      maxHeight="max-h-[90vh]"
      showClose={false}
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
              <strong className="text-text-primary">{datasetName}</strong>? This
              action cannot be undone.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
