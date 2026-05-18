"use client";

import { Button, Modal } from "@/app/components/ui";
interface DeleteDatasetModalProps {
  open: boolean;
  datasetName?: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteDatasetModal({
  open,
  datasetName,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteDatasetModalProps) {
  return (
    <Modal
      open={open}
      onClose={isDeleting ? () => {} : onClose}
      title="Delete Dataset"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete{" "}
          {datasetName ? (
            <span className="font-medium text-text-primary">{datasetName}</span>
          ) : (
            "this dataset"
          )}
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
