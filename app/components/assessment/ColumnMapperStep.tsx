"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Select } from "@/app/components/ui";
import { TrashIcon } from "@/app/components/icons";
import type {
  Attachment,
  ColumnMapping,
  ColumnMapperStepProps,
} from "@/app/lib/types/assessment";
import type { AssessmentColumnType } from "@/app/lib/types/configs";

interface InputField {
  id: string;
  name: string;
  type: AssessmentColumnType;
  strict: boolean;
}

const INPUT_TYPE_OPTIONS: Array<{
  value: AssessmentColumnType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "pdf", label: "PDF" },
];

const STRICT_OPTIONS = [
  { value: "false", label: "Optional" },
  { value: "true", label: "Required" },
];

function toFields(mapping: ColumnMapping): InputField[] {
  const strictColumns = new Set(mapping.strictColumns ?? []);
  const textFields = mapping.textColumns.map((name, index) => ({
    id: `t${index}`,
    name,
    type: "text" as AssessmentColumnType,
    strict: strictColumns.has(name),
  }));
  const attachmentFields = mapping.attachments.map((attachment, index) => ({
    id: `a${index}`,
    name: attachment.column,
    type: (attachment.type === "pdf" ? "pdf" : "image") as AssessmentColumnType,
    strict: strictColumns.has(attachment.column),
  }));
  return [...textFields, ...attachmentFields];
}

// Serialize the manual field list back into the ColumnMapping shape that
// buildAssessmentInputSchema already understands (text -> input, image/pdf ->
// attachment with format "url"); strict column names are collected separately.
function toMapping(fields: InputField[]): ColumnMapping {
  const textColumns: string[] = [];
  const attachments: Attachment[] = [];
  const strictColumns: string[] = [];
  for (const field of fields) {
    const name = field.name.trim();
    if (!name) continue;
    if (field.type === "text") {
      textColumns.push(name);
    } else {
      attachments.push({ column: name, type: field.type, format: "url" });
    }
    if (field.strict) strictColumns.push(name);
  }
  return { textColumns, attachments, groundTruthColumns: [], strictColumns };
}

export default function ColumnMapperStep({
  columnMapping,
  setColumnMapping,
  onNext,
  syncToken,
}: ColumnMapperStepProps) {
  const [fields, setFields] = useState<InputField[]>(() =>
    toFields(columnMapping),
  );
  const nextId = useRef(0);

  // Re-seed the local field list from the mapping whenever a config is
  // (re)loaded. Keyed on syncToken only (not columnMapping) so ongoing edits —
  // which flow local -> columnMapping via commit() — are never clobbered.
  const mappingRef = useRef(columnMapping);
  useEffect(() => {
    mappingRef.current = columnMapping;
  });
  const isFirstSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    setFields(toFields(mappingRef.current));
  }, [syncToken]);

  const commit = (updated: InputField[]) => {
    setFields(updated);
    setColumnMapping(toMapping(updated));
  };

  const addField = () =>
    commit([
      ...fields,
      { id: `f${nextId.current++}`, name: "", type: "text", strict: false },
    ]);

  const updateField = (id: string, patch: Partial<InputField>) =>
    commit(
      fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    );

  const removeField = (id: string) =>
    commit(fields.filter((field) => field.id !== id));

  const namedCount = fields.filter((field) => field.name.trim()).length;
  const hasField = namedCount > 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 pb-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Input Schema
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Define the input fields this configuration expects. Field names
              are referenced in the prompt as{" "}
              <code className="rounded bg-bg-secondary px-1 text-[11px]">
                {"{field_name}"}
              </code>
              . No dataset needed.
            </p>
          </div>
          <div className="rounded-full bg-bg-secondary px-3 py-1 text-xs font-medium text-text-secondary">
            {namedCount} field{namedCount === 1 ? "" : "s"}
          </div>
        </div>

        <div className="space-y-3">
          {fields.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-bg-primary px-6 py-10 text-center">
              <p className="text-sm font-medium text-text-primary">
                No input fields yet
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Add the fields your assessment reads, then reference them in the
                prompt as{" "}
                <code className="rounded bg-bg-secondary px-1 text-[11px]">
                  {"{field_name}"}
                </code>
                .
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
              <div className="grid grid-cols-[minmax(0,1fr)_120px_96px_120px_40px] gap-3 border-b border-border bg-bg-secondary px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                <span>Field name</span>
                <span>Type</span>
                <span>Format</span>
                <span>Required</span>
                <span />
              </div>
              <div className="divide-y divide-border">
                {fields.map((field) => {
                  const isAttachment = field.type !== "text";
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-[minmax(0,1fr)_120px_96px_120px_40px] items-center gap-3 px-4 py-2.5"
                    >
                      <input
                        type="text"
                        value={field.name}
                        onChange={(event) =>
                          updateField(field.id, { name: event.target.value })
                        }
                        placeholder="field name"
                        className="h-9 min-w-0 rounded-lg border border-border bg-bg-primary px-3 text-sm text-text-primary outline-none focus:ring-1"
                      />
                      <Select
                        value={field.type}
                        onChange={(event) =>
                          updateField(field.id, {
                            type: event.target.value as AssessmentColumnType,
                          })
                        }
                        options={INPUT_TYPE_OPTIONS}
                        className="h-9 w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary outline-none focus:ring-1"
                      />
                      {isAttachment ? (
                        <span className="inline-flex items-center justify-center rounded-full bg-bg-secondary px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                          url
                        </span>
                      ) : (
                        <span className="text-center text-xs text-text-secondary">
                          —
                        </span>
                      )}
                      <Select
                        value={field.strict ? "true" : "false"}
                        onChange={(event) =>
                          updateField(field.id, {
                            strict: event.target.value === "true",
                          })
                        }
                        options={STRICT_OPTIONS}
                        className="h-9 w-full cursor-pointer rounded-lg border border-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary outline-none focus:ring-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-md text-text-secondary transition-colors hover:bg-status-error-bg hover:text-status-error-text"
                        aria-label={`Delete ${field.name.trim() || "field"}`}
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            className="w-full !justify-center !rounded-xl !border-dashed !py-2.5 text-text-primary"
          >
            + Add field
          </Button>
        </div>
      </div>

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex flex-col gap-3 border-t border-border bg-bg-secondary px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3">
          <span
            className={`text-xs ${
              hasField ? "text-text-secondary" : "text-status-warning"
            }`}
          >
            {hasField ? "Ready to continue." : "Add at least one input field."}
          </span>
          <Button type="button" onClick={onNext} disabled={!hasField}>
            Next: Pre-filter
          </Button>
        </div>
      </div>
    </div>
  );
}
