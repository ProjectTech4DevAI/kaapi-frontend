"use client";

import { Button, Modal } from "@/app/components/ui";

interface DeleteConfigModalProps {
  open: boolean;
  configName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfigModal({
  open,
  configName,
  onClose,
  onConfirm,
}: DeleteConfigModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Configuration"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-6">
          {configName ? (
            <>
              Are you sure you want to delete{" "}
              <span className="font-medium text-text-primary">
                &ldquo;{configName}&rdquo;
              </span>
              ? This action cannot be undone.
            </>
          ) : (
            <>
              Are you sure you want to delete this configuration? This action
              cannot be undone.
            </>
          )}
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
