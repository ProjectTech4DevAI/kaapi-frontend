"use client";

import { Button, Modal } from "@/app/components";
import { WarningIcon } from "@/app/components/icons";

interface DeleteDatasetModalProps {
  datasetName?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteDatasetModal({
  datasetName,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteDatasetModalProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      maxWidth="max-w-md"
      maxHeight="max-h-fit"
      showClose={false}
    >
      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <WarningIcon className="w-5 h-5 text-status-error-text" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Delete dataset
            </h3>
            <p className="text-sm mt-1 text-text-secondary">
              Are you sure you want to delete{" "}
              <strong className="text-text-primary">{datasetName}</strong>? This
              action cannot be undone.
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
        <Button variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
