"use client";

import { EyeIcon } from "@/app/components/icons";
import { useAssessmentData } from "@/app/hooks";
import { loadSubmissionInputs } from "@/app/lib/assessment/submissionInputs";
import type {
  HomeRunRow,
  RunRowActionsProps,
} from "@/app/lib/types/assessment";

function resultsHref(row: HomeRunRow): string {
  const { assessment } = row;
  const version = row.version === null ? "" : ` v${row.version}`;
  const title = `${assessment.experiment_name ?? "Run"} · ${row.assessorName}${version}`;
  const query = new URLSearchParams({ title, method: assessment.method });
  return `/assessment/results/${assessment.assessment_id}?${query}`;
}

export default function RunRowActions({ row }: RunRowActionsProps) {
  const data = useAssessmentData();
  const href = resultsHref(row);
  const { submission_id: submissionId, total_items: totalItems } =
    row.assessment;

  const prefetchInputs = () => {
    if (!submissionId) return;
    void loadSubmissionInputs(data, submissionId, totalItems).catch(() => {});
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
      <a
        href={href}
        onMouseEnter={prefetchInputs}
        onFocus={prefetchInputs}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-neutral-50"
      >
        <EyeIcon className="w-3.5 h-3.5" />
        View results
      </a>
    </div>
  );
}
