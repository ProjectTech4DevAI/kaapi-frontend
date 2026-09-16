"use client";

import { ChevronDownIcon } from "@/app/components/icons";
import type { AssessorVersionChipsProps } from "@/app/lib/types/assessment";

const chipBase =
  "rounded-full border px-2.5 py-[3px] text-[11px] font-semibold transition-colors cursor-pointer";
const chipIdle =
  "border-border bg-bg-secondary text-text-secondary hover:border-accent-muted hover:text-text-primary";
const chipSelected = "border-accent-primary bg-accent-primary text-white";

export default function AssessorVersionChips({
  assessor,
  versions,
  chipCount,
  selectedVersion,
  isExpanded,
  onSelectVersion,
  onToggleExpanded,
}: AssessorVersionChipsProps) {
  const recent = (versions ?? []).slice(0, chipCount);
  const hiddenCount = (versions?.length ?? 0) - recent.length;
  const expandTitle = isExpanded
    ? "Hide versions"
    : versions
      ? `Show ${hiddenCount} older version${hiddenCount === 1 ? "" : "s"}`
      : "Show versions";

  return (
    <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
      {recent.map(({ version }) => (
        <button
          key={version}
          type="button"
          onClick={() => onSelectVersion(assessor.id, version)}
          aria-pressed={selectedVersion === version}
          className={`${chipBase} ${
            selectedVersion === version ? chipSelected : chipIdle
          }`}
        >
          v{version}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onToggleExpanded(assessor.id)}
        aria-expanded={isExpanded}
        aria-label={`Show all versions of ${assessor.name}`}
        title={expandTitle}
        className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-md border border-border bg-bg-primary text-text-secondary transition-colors hover:border-accent-muted hover:text-text-primary"
      >
        <ChevronDownIcon
          className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}
