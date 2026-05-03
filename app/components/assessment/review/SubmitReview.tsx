"use client";

import { ChevronLeftIcon } from "@/app/components/icons";
import PlayIcon from "@/app/components/icons/assessment/PlayIcon";
import type { SubmitReviewProps } from "@/app/lib/types/assessment";

export default function SubmitReview({
  isSubmitting,
  canSubmit,
  submitBlockerMessage,
  onSubmit,
  onBack,
}: SubmitReviewProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto border-t border-neutral-200 bg-neutral-50 py-2">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-neutral-900"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          {!isSubmitting && !canSubmit && (
            <span className="text-xs text-neutral-500">
              {submitBlockerMessage}
            </span>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}
            className={`flex items-center gap-2 rounded-lg border px-8 py-2.5 text-sm font-medium ${
              isSubmitting || !canSubmit
                ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-500"
                : "cursor-pointer border-neutral-900 bg-neutral-900 text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                <PlayIcon className="h-5 w-5" />
                Submit Evaluation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
