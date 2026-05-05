"use client";

import { Button } from "@/app/components";
import { ChevronLeftIcon } from "@/app/components/icons";
import PlayIcon from "@/app/components/icons/assessment/PlayIcon";

interface SubmitReviewProps {
  isSubmitting: boolean;
  canSubmit: boolean;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onBack: () => void;
}

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
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={isSubmitting}
          className="!rounded-lg !px-6"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {!isSubmitting && !canSubmit && (
            <span className="text-xs text-neutral-500">
              {submitBlockerMessage}
            </span>
          )}
          <Button
            type="button"
            size="lg"
            onClick={onSubmit}
            disabled={isSubmitting || !canSubmit}
            className="!rounded-lg !px-8"
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
          </Button>
        </div>
      </div>
    </div>
  );
}
