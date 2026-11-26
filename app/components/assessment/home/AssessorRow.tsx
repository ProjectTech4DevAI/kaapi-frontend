"use client";

import { TrashIcon } from "@/app/components/icons";
import { formatRelativeTime } from "@/app/lib/utils";
import AssessorVersionChips from "./AssessorVersionChips";
import AssessorVersionList from "./AssessorVersionList";
import type { AssessorRowProps } from "@/app/lib/types/assessment";

const CHIP_COUNT = 2;

export default function AssessorRow({
  assessor,
  selection,
  versions,
  isExpanded,
  deletingKey,
  onSelectAssessor,
  onSelectVersion,
  onToggleExpanded,
  onRequestDeleteAssessor,
  onRequestDeleteVersion,
}: AssessorRowProps) {
  const isCurrent = selection?.configId === assessor.id;
  const selectedVersion = isCurrent ? (selection?.version ?? null) : null;

  return (
    <div
      className={`rounded-lg border border-l-[3px] bg-bg-primary p-3.5 transition-shadow ${
        isCurrent
          ? "border-accent-primary border-l-accent-primary shadow-[0_0_0_1px_var(--color-accent-primary)]"
          : "border-border border-l-accent-subtle hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onSelectAssessor(assessor.id)}
          aria-pressed={isCurrent}
          title="Select this assessor — its latest version is picked automatically"
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <span className="block truncate text-sm font-semibold text-text-primary">
            {assessor.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {assessor.description ?? "No description"}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            Updated {formatRelativeTime(assessor.updated_at)}
            {versions && (
              <>
                <span className="mx-1.5 text-border">·</span>
                {versions.length} version{versions.length === 1 ? "" : "s"}
              </>
            )}
          </span>
        </button>

        <AssessorVersionChips
          assessor={assessor}
          versions={versions}
          chipCount={CHIP_COUNT}
          selectedVersion={selectedVersion}
          isExpanded={isExpanded}
          onSelectVersion={onSelectVersion}
          onToggleExpanded={onToggleExpanded}
        />

        <button
          type="button"
          disabled={deletingKey === assessor.id}
          onClick={() => onRequestDeleteAssessor(assessor)}
          aria-label={`Delete ${assessor.name}`}
          title="Delete this assessor and all its versions"
          className="mt-0.5 inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-bg-primary text-text-secondary transition-colors hover:border-status-error hover:text-status-error-text disabled:cursor-default disabled:opacity-40"
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>

      {isExpanded && (
        <AssessorVersionList
          configId={assessor.id}
          versions={versions}
          selectedVersion={selectedVersion}
          deletingKey={deletingKey}
          onSelectVersion={onSelectVersion}
          onRequestDeleteVersion={onRequestDeleteVersion}
        />
      )}
    </div>
  );
}
