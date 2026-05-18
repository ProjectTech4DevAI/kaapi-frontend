"use client";

import { Button, Modal } from "@/app/components/ui";
interface DeleteDocumentModalProps {
  open: boolean;
  fileName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteDocumentModal({
  open,
  fileName,
  onClose,
  onConfirm,
}: DeleteDocumentModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Document"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete{" "}
          {fileName ? (
            <span className="font-medium text-text-primary">{fileName}</span>
          ) : (
            "this document"
          )}
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
