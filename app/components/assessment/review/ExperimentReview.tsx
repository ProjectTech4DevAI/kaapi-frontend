"use client";

import { Field } from "@/app/components";
import type { ExperimentReviewProps } from "@/app/lib/types/assessment";

export default function ExperimentReview({
  experimentName,
  setExperimentName,
}: ExperimentReviewProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <Field
        label="Experiment Name"
        value={experimentName}
        onChange={setExperimentName}
        placeholder="e.g. GPT-4o vs Claude Sonnet on medical QA"
        className="!rounded-md !bg-neutral-50 !px-3 !py-2"
      />
      <p className="mt-1.5 text-[11px] text-neutral-500">
        A descriptive name to identify this evaluation run.
      </p>
    </div>
  );
}
