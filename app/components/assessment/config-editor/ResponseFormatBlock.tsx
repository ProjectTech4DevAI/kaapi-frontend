"use client";

import { Button } from "@/app/components/ui";
import OutputSchemaEditorInner from "../output-schema/OutputSchemaEditorInner";
import { buildExampleResponseFormat } from "@/app/lib/utils/outputSchema";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";

interface ResponseFormatBlockProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}

// The third zone of the prompt document: the structured fields the AI must
// return, edited in place (no modal). Structured output is mandatory — every
// assessment returns exactly these fields, never free text.
export default function ResponseFormatBlock({
  schema,
  setSchema,
}: ResponseFormatBlockProps) {
  const hasNamedFields = schema.some((field) => field.name.trim());

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
      <div className="border-b border-border bg-bg-secondary px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          Response format
        </span>
        <p className="mt-0.5 text-xs text-text-secondary">
          The AI fills in exactly these fields for every submission — each one
          becomes a column in your results.
        </p>
      </div>

      <div className="px-5 py-4">
        {!hasNamedFields && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-status-warning-border bg-status-warning-bg/40 px-3 py-2">
            <span className="text-xs text-text-secondary">
              At least one field is required — list what you want back, e.g.
              marks per question and feedback for the submitter.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSchema(buildExampleResponseFormat())}
              className="!px-2 !py-1 !text-xs text-accent-primary"
            >
              Insert example fields
            </Button>
          </div>
        )}
        <OutputSchemaEditorInner schema={schema} setSchema={setSchema} />
      </div>
    </section>
  );
}
