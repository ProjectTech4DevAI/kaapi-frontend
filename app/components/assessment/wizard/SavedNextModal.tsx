"use client";

import { Button, Modal } from "@/app/components/ui";
import { CheckIcon } from "@/app/components/icons";
import type { SavedNextModalProps } from "@/app/lib/types/assessment";

/** After a save: run this version now, or go back to Home. */
export default function SavedNextModal({
  open,
  title,
  onRun,
  onHome,
}: SavedNextModalProps) {
  return (
    <Modal
      open={open}
      onClose={onHome}
      maxWidth="max-w-md"
      maxHeight="max-h-fit"
      showClose={false}
    >
      <div className="px-6 py-6 text-center">
        <span className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-status-success-bg text-status-success">
          <CheckIcon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-text-secondary">
          Run an assessment on this version now, or go back to the assessment
          home.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onHome}>
          Go to home
        </Button>
        <Button type="button" onClick={onRun}>
          Run assessment
        </Button>
      </div>
    </Modal>
  );
}
