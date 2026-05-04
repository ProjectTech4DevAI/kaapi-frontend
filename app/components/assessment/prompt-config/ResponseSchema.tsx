"use client";

import { useState } from "react";
import { Button } from "@/app/components";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";

interface ResponseSchemaProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  summary: string;
  hasFields: boolean;
}
import { OutputSchemaModal } from "../OutputSchemaStep";

export default function ResponseSchema({
  schema,
  setSchema,
  summary,
  hasFields,
}: ResponseSchemaProps) {
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  return (
    <>
      <details open className="rounded-2xl border border-border bg-bg-primary">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text-primary">
              Response Format
            </div>
            <div className="mt-1 text-xs text-text-secondary">{summary}</div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={(event) => {
              event.preventDefault();
              setSchemaModalOpen(true);
            }}
            className="!min-w-[64px] !rounded-lg !px-3 !py-1.5 !text-xs !font-semibold"
          >
            {hasFields ? "Edit" : "Set"}
          </Button>
        </summary>
      </details>

      <OutputSchemaModal
        open={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
        schema={schema}
        setSchema={setSchema}
      />
    </>
  );
}
