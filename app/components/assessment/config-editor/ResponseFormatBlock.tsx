"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui";
import CompactToggleSwitch from "../CompactToggleSwitch";
import OutputSchemaEditorInner from "../output-schema/OutputSchemaEditorInner";
import { EXAMPLE_RESPONSE_FORMAT_FIELDS } from "@/app/lib/assessment/placeholders";
import { createProperty } from "@/app/lib/utils/outputSchema";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";

interface ResponseFormatBlockProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  // Changes when a config is (re)loaded, so the on/off state re-syncs.
  syncToken?: number;
}

function buildExampleFields(): SchemaProperty[] {
  return EXAMPLE_RESPONSE_FORMAT_FIELDS.map((field) => ({
    ...createProperty(),
    name: field.name,
    type: field.type,
  }));
}

// The third zone of the prompt document: the structured fields the AI must
// return, edited in place (no modal). Off = free-text response
// (json_output_schema omitted from the config).
export default function ResponseFormatBlock({
  schema,
  setSchema,
  syncToken,
}: ResponseFormatBlockProps) {
  const hasNamedFields = schema.some((field) => field.name.trim());
  const [enabled, setEnabled] = useState(hasNamedFields);

  // Re-sync the toggle when a config is (re)loaded.
  const isFirstSyncRef = useRef(true);
  const hasNamedFieldsRef = useRef(hasNamedFields);
  useEffect(() => {
    hasNamedFieldsRef.current = hasNamedFields;
  });
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    setEnabled(hasNamedFieldsRef.current);
  }, [syncToken]);

  const toggle = () => {
    if (enabled) {
      setSchema([]);
      setEnabled(false);
    } else {
      setEnabled(true);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary px-5 py-3">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Response format
          </span>
          <p className="mt-0.5 text-xs text-text-secondary">
            {enabled
              ? "The AI fills in exactly these fields for every submission."
              : "Free text — the AI replies in plain prose."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {enabled ? "Structured" : "Free text"}
          </span>
          <CompactToggleSwitch
            checked={enabled}
            onChange={toggle}
            title={
              enabled
                ? "Switch to a free-text response"
                : "Define structured output fields"
            }
          />
        </div>
      </div>

      {enabled ? (
        <div className="px-5 py-4">
          {!hasNamedFields && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2">
              <span className="text-xs text-text-secondary">
                List what you want back — e.g. marks per question and feedback
                for the student.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSchema(buildExampleFields())}
                className="!px-2 !py-1 !text-xs text-accent-primary"
              >
                Insert example fields
              </Button>
            </div>
          )}
          <OutputSchemaEditorInner schema={schema} setSchema={setSchema} />
        </div>
      ) : (
        <div className="px-5 py-4 text-xs text-text-secondary">
          Turn this on to get grades as clean columns (e.g.{" "}
          <span className="font-mono">q1_marks</span>,{" "}
          <span className="font-mono">overall_feedback</span>) instead of one
          block of text.
        </div>
      )}
    </section>
  );
}
