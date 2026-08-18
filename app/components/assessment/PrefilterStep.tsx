"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Modal } from "@/app/components/ui";
import { ExpandIcon } from "@/app/components/icons";
import CompactToggleSwitch from "@/app/components/assessment/CompactToggleSwitch";
import { DEFAULT_PREFILTER_TOPIC_RELEVANCE_PROMPT } from "@/app/lib/assessment/constants";
import type {
  PrefilterConfig,
  PrefilterStepProps,
} from "@/app/lib/types/assessment";

function ColumnChips({
  columns,
  selected,
  onChange,
}: {
  columns: string[];
  selected: string[];
  onChange: (cols: string[]) => void;
}) {
  const toggle = (col: string) => {
    onChange(
      selected.includes(col)
        ? selected.filter((c) => c !== col)
        : [...selected, col],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {columns.map((col) => {
        const active = selected.includes(col);
        return (
          <Button
            key={col}
            type="button"
            variant={active ? "secondary" : "outline"}
            size="sm"
            onClick={() => toggle(col)}
            className="!text-xs font-mono"
          >
            {col}
          </Button>
        );
      })}
      {columns.length === 0 && (
        <span className="text-xs text-text-secondary">
          No columns available. Map columns in the previous step.
        </span>
      )}
    </div>
  );
}

export default function PrefilterStep({
  columns,
  attachmentColumns = [],
  prefilterConfig,
  setPrefilterConfig,
  onNext,
  onBack,
  syncToken,
}: PrefilterStepProps) {
  const [trEnabled, setTrEnabled] = useState(
    () => !!prefilterConfig?.topic_relevance,
  );
  const [dupEnabled, setDupEnabled] = useState(
    () => !!prefilterConfig?.duplicate_detection,
  );
  const [trColumns, setTrColumns] = useState<string[]>(
    () => prefilterConfig?.topic_relevance?.columns ?? [],
  );
  const [trAttachmentColumns, setTrAttachmentColumns] = useState<string[]>(
    () =>
      prefilterConfig?.topic_relevance?.attachment_columns ?? attachmentColumns,
  );
  const [trPrompt, setTrPrompt] = useState(
    () =>
      prefilterConfig?.topic_relevance?.prompt ??
      DEFAULT_PREFILTER_TOPIC_RELEVANCE_PROMPT,
  );
  const [dupColumns, setDupColumns] = useState<string[]>(
    () => prefilterConfig?.duplicate_detection?.columns ?? [],
  );
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  // Re-seed local state from props whenever a config is (re)loaded. Keyed on
  // syncToken only so ongoing edits (which flow to prefilterConfig on Next) are
  // not clobbered mid-edit.
  const propsRef = useRef({ prefilterConfig, attachmentColumns });
  useEffect(() => {
    propsRef.current = { prefilterConfig, attachmentColumns };
  });
  const isFirstSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    const { prefilterConfig: pf, attachmentColumns: attach } = propsRef.current;
    setTrEnabled(!!pf?.topic_relevance);
    setDupEnabled(!!pf?.duplicate_detection);
    setTrColumns(pf?.topic_relevance?.columns ?? []);
    setTrAttachmentColumns(pf?.topic_relevance?.attachment_columns ?? attach);
    setTrPrompt(
      pf?.topic_relevance?.prompt ?? DEFAULT_PREFILTER_TOPIC_RELEVANCE_PROMPT,
    );
    setDupColumns(pf?.duplicate_detection?.columns ?? []);
  }, [syncToken]);

  const trHasColumns = trColumns.length > 0 || trAttachmentColumns.length > 0;

  const handleNext = () => {
    const config: PrefilterConfig = {};
    if (trEnabled && trHasColumns && trPrompt.trim()) {
      config.topic_relevance = {
        columns: trColumns,
        prompt: trPrompt.trim(),
        ...(trAttachmentColumns.length > 0
          ? { attachment_columns: trAttachmentColumns }
          : {}),
      };
    }
    if (dupEnabled && dupColumns.length > 0) {
      config.duplicate_detection = { columns: dupColumns };
    }
    setPrefilterConfig(Object.keys(config).length > 0 ? config : null);
    onNext();
  };

  const trValid = !trEnabled || (trHasColumns && !!trPrompt.trim());
  const dupValid = !dupEnabled || dupColumns.length > 0;
  const canProceed = trValid && dupValid;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 pb-16">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Pre-filter
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Optional pre-filters run before the LLM batch. Rows that fail Topic
            Relevance are excluded from Assessment and flagged in the export.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Topic Relevance
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Gate: rows with decision=REJECT are excluded from Assessment.
              </div>
            </div>
            <CompactToggleSwitch
              checked={trEnabled}
              onChange={() => setTrEnabled((v) => !v)}
              title="Enable Topic Relevance"
            />
          </div>

          {trEnabled && (
            <div className="space-y-5 border-t border-border px-5 pb-5 pt-4">
              <div>
                <label className="mb-2 block text-xs font-medium text-text-secondary">
                  Columns to evaluate
                  {attachmentColumns.length === 0 && (
                    <span className="ml-1 text-status-error-text">*</span>
                  )}
                </label>
                <ColumnChips
                  columns={columns}
                  selected={trColumns}
                  onChange={setTrColumns}
                />
                {trColumns.length === 0 && trAttachmentColumns.length === 0 && (
                  <p className="mt-1.5 text-xs text-status-warning">
                    Select at least one text or document column.
                  </p>
                )}
                {trColumns.length > 0 && (
                  <p className="mt-2 text-xs text-text-secondary">
                    Export will include:{" "}
                    {trColumns
                      .map((c) => (
                        <span key={c} className="font-mono">
                          topic_relevance_{c}
                        </span>
                      ))
                      .reduce<React.ReactNode[]>((acc, el, i) => {
                        if (i === 0) return [el];
                        return [...acc, ", ", el];
                      }, [])}{" "}
                    (true/false per column)
                  </p>
                )}
              </div>

              {attachmentColumns.length > 0 && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-text-secondary">
                    Documents to include
                  </label>
                  <ColumnChips
                    columns={attachmentColumns}
                    selected={trAttachmentColumns}
                    onChange={setTrAttachmentColumns}
                  />
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {trAttachmentColumns.length > 0
                      ? "Selected documents are sent to the model — Topic Relevance is judged on text and these documents."
                      : "No documents selected — Topic Relevance uses text columns only."}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="block text-xs font-medium text-text-secondary">
                    Assessment prompt / rubric
                    <span className="ml-1 text-status-error-text">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPromptModalOpen(true)}
                    aria-label="Expand prompt editor"
                    title="Expand"
                    className="cursor-pointer rounded-md p-1 text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                  >
                    <ExpandIcon className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={trPrompt}
                  onChange={(e) => setTrPrompt(e.target.value)}
                  rows={6}
                  placeholder="Write your ACCEPT/REJECT rules here..."
                  className="w-full resize-y rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20"
                />
                {!trPrompt.trim() && (
                  <p className="mt-1 text-xs text-status-warning">
                    Assessment prompt is required.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Duplicate Detection
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Passthrough: runs only on rows that passed Topic Relevance.
                Results appear in export; does not gate Assessment.
              </div>
            </div>
            <CompactToggleSwitch
              checked={dupEnabled}
              onChange={() => setDupEnabled((v) => !v)}
              title="Enable Duplicate Detection"
            />
          </div>

          {dupEnabled && (
            <div className="border-t border-border px-5 pb-5 pt-4">
              <label className="mb-2 block text-xs font-medium text-text-secondary">
                Columns to check for duplicates
              </label>
              <ColumnChips
                columns={columns}
                selected={dupColumns}
                onChange={setDupColumns}
              />
              {dupEnabled && dupColumns.length === 0 && (
                <p className="mt-1.5 text-xs text-status-warning">
                  Select at least one column.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        title="Assessment prompt / rubric"
        maxWidth="max-w-4xl"
        maxHeight="max-h-[85vh]"
      >
        <div className="px-6 pb-6">
          <textarea
            value={trPrompt}
            onChange={(e) => setTrPrompt(e.target.value)}
            placeholder="Write your ACCEPT/REJECT rules here..."
            className="h-[60vh] w-full resize-none rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/20"
          />
          {!trPrompt.trim() && (
            <p className="mt-1 text-xs text-status-warning">
              Evaluation prompt is required.
            </p>
          )}
        </div>
      </Modal>

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-border bg-bg-secondary px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="text-xs text-text-secondary">
              {!trEnabled && !dupEnabled
                ? "No filters enabled — Pre-filter will be skipped."
                : canProceed
                  ? "Ready to continue."
                  : "Complete required fields above."}
            </span>
            <Button type="button" onClick={handleNext} disabled={!canProceed}>
              Next: Assessment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
