"use client";

import { useState } from "react";
import { Button, Field, Modal } from "@/app/components/ui";
import { DocumentFileIcon, ImageIcon } from "@/app/components/icons";
import {
  fieldTypeOf,
  TOKEN_RE,
  tokenName,
} from "@/app/lib/assessment/promptTokens";
import { schemaToJsonSchema } from "@/app/lib/utils/assessment";
import type {
  PromptFieldType,
  ReviewSaveModalProps,
  WizardDraft,
} from "@/app/lib/types/assessment";

const PREVIEW_LIMIT = 420;
const VALUE_LIMIT = 90;

const eyebrow =
  "mb-2 text-[11px] font-semibold tracking-wider uppercase text-text-secondary";
const blockHeading =
  "bg-bg-secondary px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-secondary";
const blockBody =
  "max-h-48 overflow-auto px-3 py-2 font-mono text-xs leading-6 whitespace-pre-wrap";

/** Last stop before a version is written: what changed, and what to call it. */
export default function ReviewSaveModal({
  open,
  draft,
  sampleRow,
  defaultName,
  isSaving,
  onClose,
  onSave,
}: ReviewSaveModalProps) {
  const [name, setName] = useState(defaultName);
  const [commitMessage, setCommitMessage] = useState("");

  const referenced = referencedFields(draft);
  const schemaJson = schemaToJsonSchema(draft.outputSchema);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Review & save"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-6 px-6 py-4">
        <section>
          <p className={eyebrow}>Your submission set needs these columns</p>
          {referenced.length === 0 ? (
            <p className="text-xs text-text-secondary">
              No columns referenced yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {referenced.map(({ name: column, type, strict }) => (
                <span
                  key={column}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2.5 py-1 font-mono text-[11px] text-text-primary"
                >
                  {type === "text" ? (
                    "@"
                  ) : type === "image" ? (
                    <ImageIcon className="h-3 w-3" />
                  ) : (
                    <DocumentFileIcon className="h-3 w-3" />
                  )}
                  {column}
                  <span className="font-sans text-[10px] text-text-secondary">
                    {type}
                    {strict && " · required"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className={eyebrow}>Assembled prompt</p>
          <div className="overflow-hidden rounded-xl border border-border">
            <p className={blockHeading}>
              Instructions (same for every submission)
            </p>
            <pre className={blockBody}>
              {truncate(draft.assessment.instructions, PREVIEW_LIMIT) ||
                "(empty)"}
            </pre>
            <p className={`${blockHeading} border-t border-border`}>
              Submission (preview with the first row)
            </p>
            <pre className={blockBody}>
              {fillTokens(draft.assessment.submission, sampleRow) || "(empty)"}
            </pre>
            <p className={`${blockHeading} border-t border-border`}>
              Output schema (enforced as structured output)
            </p>
            <pre className={blockBody}>
              {schemaJson
                ? JSON.stringify(schemaJson, null, 2)
                : "No output fields defined yet."}
            </pre>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <Field
            label="Assessor name"
            value={name}
            onChange={setName}
            placeholder="e.g., SIM Idea Evaluation"
            className="!rounded-md !bg-bg-primary"
          />
          <Field
            label="Save note"
            value={commitMessage}
            onChange={setCommitMessage}
            placeholder="Optional — what changed?"
            className="!rounded-md !bg-bg-primary"
          />
        </section>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!name.trim() || isSaving}
          onClick={() => onSave(name.trim(), commitMessage.trim())}
        >
          {isSaving ? "Saving..." : "Save assessor"}
        </Button>
      </div>
    </Modal>
  );
}

function referencedFields(
  draft: WizardDraft,
): { name: string; type: PromptFieldType; strict: boolean }[] {
  const names = new Set<string>();
  [draft.prefilter, draft.assessment].forEach((zones) => {
    [zones.instructions, zones.submission].forEach((text) => {
      for (const match of text.matchAll(TOKEN_RE)) {
        names.add(tokenName(match[0]));
      }
    });
  });

  return [...names].map((name) => ({
    name,
    type: fieldTypeOf(draft.fieldTypes, name),
    strict: draft.fieldStrict[name] ?? false,
  }));
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? `${value.slice(0, limit)} …` : value;
}

function fillTokens(text: string, sampleRow: Record<string, string>): string {
  return text.replace(TOKEN_RE, (raw) => {
    const value = sampleRow[tokenName(raw)];
    if (!value) return raw;
    return value.length > VALUE_LIMIT
      ? `${value.slice(0, VALUE_LIMIT)}…`
      : value;
  });
}
