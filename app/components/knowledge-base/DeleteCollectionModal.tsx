"use client";

import { Button, Modal } from "@/app/components/ui";
interface DeleteCollectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteCollectionModal({
  open,
  onClose,
  onConfirm,
}: DeleteCollectionModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Collection"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete this collection? This action cannot be
          undone.
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
