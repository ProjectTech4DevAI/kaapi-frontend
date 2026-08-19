"use client";

import { useState } from "react";
import { Button, Select } from "@/app/components/ui";
import { TrashIcon } from "@/app/components/icons";
import type { DerivedField } from "@/app/lib/types/assessment";
import type { AssessmentColumnType } from "@/app/lib/types/configs";

const FIELD_TYPE_OPTIONS: Array<{
  value: AssessmentColumnType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image (link)" },
  { value: "pdf", label: "PDF (link)" },
];

interface FieldsCardProps {
  fields: DerivedField[];
  onTypeChange: (name: string, type: AssessmentColumnType) => void;
  onRemove: (name: string) => void;
  onAdd: (name: string, type: AssessmentColumnType) => void;
}

// Passive companion to the Submission editor: every @-referenced column shows
// up here with a type select (defaults to Text) so type capture never
// interrupts writing. This list becomes the config's input_schema on save.
export default function FieldsCard({
  fields,
  onTypeChange,
  onRemove,
  onAdd,
}: FieldsCardProps) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AssessmentColumnType>("text");

  const textFields = fields.filter((f) => f.type === "text");
  const attachmentFields = fields.filter((f) => f.type !== "text");

  const addField = () => {
    const name = newName.trim();
    if (!name) return;
    onAdd(name, newType);
    setNewName("");
    setNewType("text");
  };

  const renderRow = (field: DerivedField) => (
    <div key={field.name} className="py-1.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">
          {field.type === "text" ? "@" : "📎 "}
          {field.name}
        </span>
        {!field.referenced && (
          <span
            className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] text-text-secondary"
            title="Not used in your prompt — it still must exist in the dataset."
          >
            not referenced
          </span>
        )}
        <Select
          value={field.type}
          onChange={(e) =>
            onTypeChange(field.name, e.target.value as AssessmentColumnType)
          }
          options={FIELD_TYPE_OPTIONS}
          className="h-8 w-32 cursor-pointer rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary outline-none focus:ring-1"
        />
        <button
          type="button"
          onClick={() => onRemove(field.name)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label={`Remove field ${field.name}`}
          title="Remove field"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      {field.warning && (
        <p className="mt-0.5 text-[11px] text-status-warning-text">
          ⚠ {field.warning}
        </p>
      )}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-bg-primary">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-text-primary">Fields</div>
        <div className="mt-0.5 text-xs text-text-secondary">
          From your prompt — your dataset needs a column for each.
        </div>
      </div>
      <div className="px-4 py-3">
        {fields.length === 0 ? (
          <p className="text-xs text-text-secondary">
            Type <span className="font-mono">@</span> in the Submission editor
            to reference dataset columns — they appear here.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {textFields.length > 0 && (
              <div className="pb-1">
                <div className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  In the submission
                </div>
                {textFields.map(renderRow)}
              </div>
            )}
            {attachmentFields.length > 0 && (
              <div className="pt-1">
                <div className="pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Attached files
                </div>
                {attachmentFields.map(renderRow)}
                <p className="pt-1 text-[11px] text-text-secondary">
                  File links are attached automatically with every submission.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addField();
              }
            }}
            placeholder="Add a field (column name)"
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-2.5 text-xs text-text-primary outline-none focus:border-accent-primary"
          />
          <Select
            value={newType}
            onChange={(e) => setNewType(e.target.value as AssessmentColumnType)}
            options={FIELD_TYPE_OPTIONS}
            className="h-8 w-28 cursor-pointer rounded-md border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary outline-none focus:ring-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addField}
            disabled={!newName.trim()}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
