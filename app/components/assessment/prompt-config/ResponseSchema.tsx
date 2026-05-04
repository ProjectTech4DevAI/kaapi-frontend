"use client";

import { useState } from "react";
import type { ResponseSchemaProps } from "@/app/lib/types/assessment";
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
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setSchemaModalOpen(true);
            }}
            className="min-w-[64px] cursor-pointer rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover"
          >
            {hasFields ? "Edit" : "Set"}
          </button>
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
