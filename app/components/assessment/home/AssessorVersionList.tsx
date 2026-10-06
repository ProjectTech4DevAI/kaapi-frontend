"use client";

import { TrashIcon } from "@/app/components/icons";
import type { AssessorVersionListProps } from "@/app/lib/types/assessment";

export default function AssessorVersionList({
  configId,
  versions,
  selectedVersion,
  deletingKey,
  onSelectVersion,
  onRequestDeleteVersion,
}: AssessorVersionListProps) {
  if (!versions) {
    return (
      <p className="mt-2.5 border-t border-border pt-2 text-xs text-text-secondary">
        Loading versions…
      </p>
    );
  }

  return (
    <ul className="mt-2.5 flex max-h-32 flex-col gap-1.5 overflow-y-auto border-t border-border pt-2">
      {versions.map((version) => {
        const isSelected = selectedVersion === version.version;
        const isDeleting = deletingKey === `${configId}:v${version.version}`;
        return (
          <li key={version.id} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelectVersion(configId, version.version)}
              aria-pressed={isSelected}
              className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
                isSelected
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-border bg-bg-secondary hover:border-accent-muted"
              }`}
            >
              <span className="min-w-[22px] shrink-0 text-[11px] font-bold text-text-primary">
                v{version.version}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  isSelected ? "text-text-primary" : "text-text-secondary"
                }`}
              >
                {version.commit_message ?? "No note"}
              </span>
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => onRequestDeleteVersion(configId, version.version)}
              aria-label={`Delete version v${version.version}`}
              title={`Delete v${version.version}`}
              className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-bg-primary text-text-secondary transition-colors hover:border-status-error hover:text-status-error-text disabled:cursor-default disabled:opacity-40"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
