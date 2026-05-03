"use client";

import type { ExperimentReviewProps } from "@/app/lib/types/assessment";

export default function ExperimentReview({
  experimentName,
  setExperimentName,
}: ExperimentReviewProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <label className="mb-1.5 block text-xs font-medium text-neutral-500">
        Experiment Name
      </label>
      <input
        type="text"
        value={experimentName}
        onChange={(event) => setExperimentName(event.target.value)}
        placeholder="e.g. GPT-4o vs Claude Sonnet on medical QA"
        className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
      />
      <p className="mt-1.5 text-[11px] text-neutral-500">
        A descriptive name to identify this evaluation run.
      </p>
    </div>
  );
}
