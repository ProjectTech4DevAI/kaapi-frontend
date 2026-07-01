"use client";

import type { ReactNode } from "react";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";
import OutputSchemaEditorInner from "./output-schema/OutputSchemaEditorInner";

interface OutputSchemaEditorProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  title?: string;
  description?: ReactNode;
}

export { default as OutputSchemaModal } from "./output-schema/OutputSchemaModal";

export function OutputSchemaEditor({
  schema,
  setSchema,
  title = "Response Format",
  description,
}: OutputSchemaEditorProps) {
  return (
    <div className="space-y-5">
      {title && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          ) : null}
        </div>
      )}
      <OutputSchemaEditorInner schema={schema} setSchema={setSchema} />
    </div>
  );
}

export default OutputSchemaEditor;
