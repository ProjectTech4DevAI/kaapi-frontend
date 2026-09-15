"use client";

import { useState } from "react";
import { PlusIcon, SearchIcon } from "@/app/components/icons";
import { Button } from "@/app/components/ui";
import AssessorRow from "./AssessorRow";
import DeleteAssessorDialog, {
  type DeleteTarget,
} from "./DeleteAssessorDialog";
import type { UseAssessmentHomeResult } from "@/app/lib/types/assessment";
import HomePanel from "./HomePanel";

interface AssessorsPanelProps {
  home: UseAssessmentHomeResult;
  onNewAssessor: () => void;
  onEditVersion: () => void;
}

export default function AssessorsPanel({
  home,
  onNewAssessor,
  onEditVersion,
}: AssessorsPanelProps) {
  const { assessors, selection } = home;
  const [pendingDelete, setPendingDelete] = useState<DeleteTarget | null>(null);

  return (
    <HomePanel
      title="Assessors"
      className="min-h-0 w-full flex-1 border-b border-border bg-bg-secondary lg:w-[52%] lg:max-w-[760px] lg:flex-none lg:border-r lg:border-b-0"
      countLabel={`${assessors.length} assessor${assessors.length === 1 ? "" : "s"}`}
      cursor={{
        hasPrev: home.hasPrevAssessors,
        hasNext: home.hasNextAssessors,
        onPrev: home.showPrevAssessors,
        onNext: home.showNextAssessors,
      }}
      headerActions={
        <>
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 w-3.5 h-3.5 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={home.assessorSearch}
              onChange={(event) => home.setAssessorSearch(event.target.value)}
              placeholder="Search assessors..."
              aria-label="Search assessors"
              className="w-full rounded-full border border-border bg-bg-primary py-1.5 pr-3 pl-8 text-[13px] text-text-primary transition-colors placeholder:text-neutral-400 focus:border-accent-primary focus:outline-none"
            />
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={onNewAssessor}
            title="Create a new assessor from scratch"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={!selection}
            onClick={onEditVersion}
            title={
              selection
                ? `Edit v${selection.version} — saving creates the next version`
                : "Select an assessor version on the left to edit it"
            }
          >
            Edit
          </Button>
        </>
      }
    >
      {assessors.map((assessor) => (
        <AssessorRow
          key={assessor.id}
          assessor={assessor}
          selection={selection}
          versions={home.versionsByAssessor[assessor.id]}
          isExpanded={home.expandedAssessorIds.has(assessor.id)}
          deletingKey={home.deletingKey}
          onSelectAssessor={home.selectAssessor}
          onSelectVersion={home.selectVersion}
          onToggleExpanded={home.toggleAssessorExpanded}
          onRequestDeleteAssessor={(target) =>
            setPendingDelete({
              kind: "assessor",
              configId: target.id,
              name: target.name,
            })
          }
          onRequestDeleteVersion={(configId, version) =>
            setPendingDelete({ kind: "version", configId, version })
          }
        />
      ))}

      {assessors.length === 0 && (
        <p
          role="status"
          className="py-12 text-center text-[13px] text-text-secondary"
        >
          {home.assessorSearch
            ? "No assessors match your search."
            : "No assessors yet — start with New."}
        </p>
      )}

      {pendingDelete && (
        <DeleteAssessorDialog
          target={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const target = pendingDelete;
            setPendingDelete(null);
            void (target.kind === "assessor"
              ? home.deleteAssessor(target.configId)
              : home.deleteAssessorVersion(target.configId, target.version));
          }}
        />
      )}
    </HomePanel>
  );
}
