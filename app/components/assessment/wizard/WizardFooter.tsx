"use client";

import { Button } from "@/app/components/ui";
import type { WizardFooterProps } from "@/app/lib/types/assessment";

export default function WizardFooter({
  showBack,
  hint,
  nextLabel,
  nextDisabled,
  isBusy,
  onBack,
  onNext,
}: WizardFooterProps) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-t border-border bg-bg-secondary px-6">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className={showBack ? "" : "invisible"}
      >
        ‹ Back
      </Button>

      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-xs text-text-secondary">{hint}</span>
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || isBusy}
          className="shrink-0"
        >
          {isBusy ? "Submitting..." : nextLabel}
        </Button>
      </div>
    </div>
  );
}
