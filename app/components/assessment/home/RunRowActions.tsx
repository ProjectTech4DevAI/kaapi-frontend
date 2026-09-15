"use client";

import { DownloadIcon, EyeIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui";
import { isTerminalStatus } from "@/app/lib/assessment/results";
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

/** Export / View results, per the run's status. Retry has no BATCH endpoint yet. */
export default function RunRowActions({
  row,
  isExporting,
  onExport,
}: RunRowActionsProps) {
  const { assessment } = row;
  const href = resultsHref(row);
  // Exportable once the run stops, errors included — those rows are results too.
  const canExport = isTerminalStatus(assessment.status);

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-end gap-2">
      {canExport && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isExporting}
          onClick={() =>
            onExport(
              {
                assessment_id: assessment.assessment_id,
                method: assessment.method,
              },
              assessment.experiment_name ?? assessment.assessment_id,
            )
          }
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          {isExporting ? "Exporting…" : "Export"}
        </Button>
      )}

      <a
        href={href}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-bg-primary px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-neutral-50"
      >
        <EyeIcon className="w-3.5 h-3.5" />
        View results
      </a>
    </div>
  );
}
