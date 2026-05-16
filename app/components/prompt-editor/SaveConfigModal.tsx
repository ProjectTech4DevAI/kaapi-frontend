"use client";

import { Button, Modal } from "@/app/components/ui";
interface SaveConfigModalProps {
  open: boolean;
  configName: string;
  isUpdate: boolean;
  commitMessage: string;
  onCommitMessageChange: (value: string) => void;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SaveConfigModal({
  open,
  configName,
  isUpdate,
  commitMessage,
  onCommitMessageChange,
  isSaving,
  onClose,
  onConfirm,
}: SaveConfigModalProps) {
  return (
    <Modal
      open={open}
      onClose={isSaving ? () => {} : onClose}
      title={isUpdate ? "Save New Version" : "Save Configuration"}
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-6">
        <p className="text-sm text-text-secondary mb-4 wrap-break-word">
          {isUpdate ? (
            <>
              A new version of{" "}
              <span className="font-medium text-text-primary break-all">
                {configName}
              </span>{" "}
              will be created with your current changes.
            </>
          ) : (
            <>
              A new configuration named{" "}
              <span className="font-medium text-text-primary break-all">
                {configName}
              </span>{" "}
              will be created.
            </>
          )}
        </p>

        <label className="block text-xs font-semibold mb-2 text-text-primary">
          Commit Message{" "}
          <span className="font-normal text-text-secondary">(Optional)</span>
        </label>
        <input
          type="text"
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          placeholder={isUpdate ? "Describe your changes…" : "Initial version"}
          disabled={isSaving}
          className="w-full px-3 py-2 rounded-md border border-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary transition-colors"
        />
        <p className="text-xs mt-1.5 text-text-secondary">
          Helps you and your teammates understand what changed in this version.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isSaving}>
            {isSaving
              ? isUpdate
                ? "Saving version…"
                : "Saving…"
              : isUpdate
                ? "Save New Version"
                : "Save Configuration"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
