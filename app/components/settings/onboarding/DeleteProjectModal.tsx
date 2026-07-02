"use client";

import { useState } from "react";
import { Button, Checkbox, Field, Modal } from "@/app/components/ui";
import { WarningIcon } from "@/app/components/icons";
import { Project } from "@/app/lib/types/onboarding";

interface DeleteProjectModalProps {
  project: Project;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (hardDelete: boolean) => void;
}

const HARD_DELETE_ITEMS = [
  "Collections and documents",
  "Credentials and assistants",
  "Fine-tunings and conversations",
  "User-project mappings",
];

export default function DeleteProjectModal({
  project,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteProjectModalProps) {
  const [typedName, setTypedName] = useState("");
  const [hardDelete, setHardDelete] = useState(false);
  const nameMatches = typedName.trim() === project.name;
  const canDelete = nameMatches && !isDeleting;

  return (
    <Modal
      open
      onClose={onCancel}
      title="Delete project"
      maxWidth="max-w-md"
      maxHeight="max-h-fit"
    >
      <div className="px-6 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
            <WarningIcon className="w-5 h-5 text-status-error-text" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary wrap-anywhere">
              You&apos;re about to delete <strong>{project.name}</strong>.
            </p>
            {!hardDelete && (
              <p className="text-xs text-text-secondary mt-1">
                Soft delete — the project is marked inactive. No data is removed
                and you can reactivate it later.
              </p>
            )}
          </div>
        </div>

        {hardDelete && (
          <div className="rounded-lg border border-status-error-border bg-status-error-bg/40 px-3 py-2.5">
            <p className="text-xs font-semibold text-status-error-text">
              Permanent delete — this cannot be undone.
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Everything under this project will be removed:
            </p>
            <ul className="mt-1.5 space-y-0.5 text-xs text-text-secondary list-disc pl-5">
              {HARD_DELETE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <Checkbox
          checked={hardDelete}
          onChange={setHardDelete}
          disabled={isDeleting}
          accent="error"
          label="Permanently delete"
        />

        <div>
          <label className="block text-xs text-text-secondary mb-1.5">
            To confirm, type the project name below:
          </label>
          <Field
            label=""
            value={typedName}
            onChange={setTypedName}
            placeholder={project.name}
            disabled={isDeleting}
            autoFocus
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
        <Button
          variant="outline"
          size="md"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={() => onConfirm(hardDelete)}
          disabled={!canDelete}
        >
          {isDeleting
            ? "Deleting…"
            : hardDelete
              ? "Permanently delete"
              : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}
