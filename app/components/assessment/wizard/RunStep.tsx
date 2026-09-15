"use client";

import { useState } from "react";
import { Button, Field, Select } from "@/app/components/ui";
import { CloudUploadIcon, EyeIcon } from "@/app/components/icons";
import CreatePanel from "@/app/components/assessment/datasets/CreatePanel";
import DataViewModal from "@/app/components/assessment/DataViewModal";
import { RUN_PREVIEW_ROW_LIMIT } from "@/app/lib/assessment/constants";
import type {
  RunStepProps,
  UseSubmissionStepResult,
} from "@/app/lib/types/assessment";

interface PreviewState {
  isLoading: boolean;
  isDisabled: boolean;
  rows: string[][];
}

function previewState(step: UseSubmissionStepResult): PreviewState {
  return {
    isLoading: step.viewingId === step.selectedId,
    isDisabled: !step.selectedId || step.viewingId !== null,
    rows: step.viewModalData?.rows.slice(0, RUN_PREVIEW_ROW_LIMIT) ?? [],
  };
}

function previewSubtitle(shown: number, total: number | undefined): string {
  if (total === undefined || total <= shown) {
    return `${shown} row${shown === 1 ? "" : "s"}`;
  }
  return `First ${shown} of ${total} rows`;
}

/** Wizard step 4: confirm the submission set and assessor version, then run. */
export default function RunStep({ wizard, step }: RunStepProps) {
  const [showUpload, setShowUpload] = useState(false);
  const linkedId = wizard.versionDetail?.submission_id;

  const selected = step.submissions.find(
    (submission) => submission.submission_id === step.selectedId,
  );
  const preview = previewState(step);

  const closeUpload = () => {
    step.form.reset();
    setShowUpload(false);
  };

  const options = step.submissions.map((submission) => {
    const isDefault = submission.submission_id === linkedId;
    return {
      value: submission.submission_id,
      label: `${submission.name} (${submission.total_items} items)${
        isDefault ? " — default" : ""
      }`,
    };
  });

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Run assessment
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            Confirm the submission set and assessor version, then run.
          </p>
        </div>

        <section className="rounded-2xl border border-border bg-bg-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary">
            Submission
          </h3>
          <p className="mb-3 text-xs text-text-secondary">
            Which submissions should this run assess?
          </p>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Submission set"
              value={step.selectedId}
              options={options}
              placeholder={options.length ? undefined : "No submissions yet"}
              onChange={(event) => void step.handleSelect(event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-md!"
              disabled={preview.isDisabled}
              onClick={() =>
                void step.handleView(step.selectedId, selected?.name ?? "")
              }
            >
              <EyeIcon className="h-3.5 w-3.5" />
              {preview.isLoading ? "Loading..." : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-md!"
              onClick={() => (showUpload ? closeUpload() : setShowUpload(true))}
            >
              <CloudUploadIcon className="h-3.5 w-3.5" />
              Upload new
            </Button>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Defaults to the set linked to this assessor version.
          </p>

          {showUpload && (
            <div className="mt-3 border-t border-dashed border-border pt-3">
              <CreatePanel
                layout="inline"
                form={step.form}
                isCreating={step.isCreating}
                onCancel={() => setShowUpload(false)}
                onCreate={async () => {
                  await step.handleCreate();
                  setShowUpload(false);
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-bg-primary p-5">
          <h3 className="text-sm font-semibold text-text-primary">Assessor</h3>
          <p className="mb-3 text-xs text-text-secondary">
            Every row runs through the pre-filter, then this assessor version.
          </p>
          {wizard.context ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2.5">
              <span className="text-[13px] font-semibold text-text-primary">
                {wizard.context.assessorName}
              </span>
              <span className="rounded-full border border-border bg-bg-primary px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase text-text-secondary">
                v{wizard.context.version}
              </span>
              {wizard.versionDetail?.model && (
                <span className="rounded-full bg-bg-primary px-2 py-0.5 font-mono text-[10px] text-text-secondary">
                  {wizard.versionDetail.model}
                </span>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-bg-secondary px-3 py-2.5 text-xs leading-5 text-text-secondary">
              This assessor hasn’t been saved yet, so there is no version to
              run. Review &amp; save lands in the next slice — until then, start
              a run from Home by selecting an existing assessor version.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-bg-primary p-5">
          <h3 className="mb-3 text-sm font-semibold text-text-primary">
            Run name
          </h3>
          <Field
            label=""
            value={wizard.runName}
            onChange={wizard.setRunName}
            placeholder="e.g., SIM Pilot — Batch 2"
            className="!rounded-md !bg-bg-primary"
          />
        </section>
      </div>

      {step.viewModalData && (
        <DataViewModal
          title={step.viewModalData.name}
          subtitle={previewSubtitle(preview.rows.length, selected?.total_items)}
          headers={step.viewModalData.headers}
          rows={preview.rows}
          onClose={() => step.setViewModalData(null)}
        />
      )}
    </div>
  );
}
