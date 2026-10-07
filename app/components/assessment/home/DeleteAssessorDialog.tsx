"use client";

import { WarningIcon } from "@/app/components/icons";
import { Button, Modal } from "@/app/components/ui";
import type { DeleteAssessorDialogProps } from "@/app/lib/types/assessment";

export default function DeleteAssessorDialog({
  target,
  onCancel,
  onConfirm,
}: DeleteAssessorDialogProps) {
  const isAssessor = target.kind === "assessor";

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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-error-bg text-status-error">
            <WarningIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {isAssessor ? "Delete assessor" : "Delete version"}
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              {isAssessor ? (
                <>
                  Are you sure you want to delete{" "}
                  <b className="break-all text-text-primary">{target.name}</b>{" "}
                  and every version saved under it? Runs already made with it
                  stay. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <b className="text-text-primary">v{target.version}</b>? This
                  action cannot be undone.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}
