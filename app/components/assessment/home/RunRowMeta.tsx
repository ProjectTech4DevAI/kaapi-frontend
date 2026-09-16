import { DatabaseIcon } from "@/app/components/icons";
import { formatRelativeTime } from "@/app/lib/utils";
import type { RunRowMetaProps } from "@/app/lib/types/assessment";

export default function RunRowMeta({ row }: RunRowMetaProps) {
  const { assessment, assessorName, version, cost } = row;

  return (
    <>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
        <span>Started {formatRelativeTime(assessment.inserted_at)}</span>
        <span className="text-border">·</span>
        <span className="truncate">
          {assessorName}
          {version === null ? "" : ` v${version}`}
        </span>
        {cost && (
          <>
            <span className="text-border">·</span>
            <span>{cost}</span>
          </>
        )}
      </p>

      <p className="mt-1 flex items-center gap-1.5 text-xs text-text-secondary">
        <DatabaseIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{assessment.submission_name ?? "—"}</span>
      </p>
    </>
  );
}
