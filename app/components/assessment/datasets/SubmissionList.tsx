"use client";

import { DatasetListSkeleton } from "@/app/components";
import { DatabaseIcon } from "@/app/components/icons";
import EvalDatasetDescription from "@/app/components/evaluations/EvalDatasetDescription";
import { Button } from "@/app/components/ui";
import type {
  AssessmentSubmission,
  ValueSetter,
} from "@/app/lib/types/assessment";

interface SubmissionListProps {
  submissions: AssessmentSubmission[];
  selectedId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: string | null;
  onSelect: (id: string, name?: string) => void;
  onView: (submissionId: string, name: string) => void;
  onRequestDelete: ValueSetter<string>;
}

export default function SubmissionList({
  submissions,
  selectedId,
  isLoading,
  isLoadingColumns,
  viewingId,
  onSelect,
  onView,
  onRequestDelete,
}: SubmissionListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-secondary">
      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Submissions
            </h3>
            <p className="mt-2 inline-block rounded-full border border-accent-secondary bg-accent-secondary/15 px-3 py-2 text-xs font-medium text-text-primary">
              Pick the submission set for this assessor, or upload a new one.
            </p>
            <p className="mt-2 max-w-xl text-xs leading-5 text-text-secondary">
              Each row becomes one submission. Its columns load into the system,
              so you can tag them with “@” in the pre-filter and assessment
              steps.
            </p>
          </div>
          {isLoadingColumns && (
            <span className="shrink-0 text-xs text-text-secondary">
              Loading columns...
            </span>
          )}
        </div>

        {isLoading ? (
          <DatasetListSkeleton count={4} />
        ) : submissions.length === 0 ? (
          <div className="p-16 text-center">
            <DatabaseIcon className="mx-auto mb-3 h-12 w-12 text-border" />
            <p className="mb-1 text-sm font-medium text-text-primary">
              No submissions yet
            </p>
            <p className="text-xs text-text-secondary">
              Create your first submission set using the form on the right
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {submissions.map((submission) => {
              const isSelected = selectedId === submission.submission_id;
              return (
                <li key={submission.submission_id}>
                  <div
                    className={`overflow-hidden rounded-lg border-l-[3px] bg-bg-primary transition-all ${
                      isSelected
                        ? "border-l-accent-primary ring-1 ring-accent-primary shadow-sm"
                        : "border-l-accent-secondary shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 px-5 py-4">
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() =>
                          onSelect(submission.submission_id, submission.name)
                        }
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {submission.name}
                        </span>
                        {submission.description && (
                          <EvalDatasetDescription
                            description={submission.description}
                          />
                        )}
                        <span className="mt-2 flex items-center gap-3 text-xs text-text-secondary">
                          <span>{submission.total_items} items</span>
                          {submission.total_items > 0 &&
                            submission.total_items !==
                              submission.total_items && (
                              <>
                                <span className="text-border">·</span>
                                <span>{submission.total_items} original</span>
                              </>
                            )}
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onView(submission.submission_id, submission.name)
                          }
                          disabled={viewingId === submission.submission_id}
                        >
                          {viewingId === submission.submission_id
                            ? "Loading..."
                            : "View"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onRequestDelete(submission.submission_id)
                          }
                          aria-label={`Delete ${submission.name}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
