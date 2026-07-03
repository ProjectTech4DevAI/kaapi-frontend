"use client";

import { Button, Field, Modal } from "@/app/components/ui";
import { APP_NAME } from "@/app/lib/constants";

interface AddKeyModalProps {
  open: boolean;
  newKeyLabel: string;
  newKeyValue: string;
  isValidating?: boolean;
  onLabelChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onAddKey: () => void;
  onClose: () => void;
}

export default function AddKeyModal({
  open,
  newKeyLabel,
  newKeyValue,
  isValidating,
  onLabelChange,
  onValueChange,
  onAddKey,
  onClose,
}: AddKeyModalProps) {
  const isDisabled =
    !newKeyLabel.trim() || !newKeyValue.trim() || !!isValidating;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add New API Key"
      maxWidth="max-w-lg"
    >
      <div className="px-6 pb-2">
        <p className="text-sm mb-5 text-text-secondary">
          Add a new API key to use in your evaluation workflows. Keys are stored
          securely server-side and cannot be viewed again after they are added.
        </p>

        <div className="space-y-4">
          <Field
            label="Provider"
            value={APP_NAME}
            onChange={() => {}}
            disabled
          />

          <Field
            label="Label"
            value={newKeyLabel}
            onChange={onLabelChange}
            placeholder="e.g., Production Key"
          />

          <Field
            label="API Key"
            type="password"
            value={newKeyValue}
            onChange={onValueChange}
            placeholder="Paste your API key here"
          />
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <Button variant="outline" onClick={onClose} disabled={isValidating}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onAddKey} disabled={isDisabled}>
          {isValidating ? "Validating…" : "Add API Key"}
        </Button>
      </div>
    </Modal>
  );
}
