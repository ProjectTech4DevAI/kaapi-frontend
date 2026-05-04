"use client";

import { Button } from "@/app/components";
import { ChevronLeftIcon } from "@/app/components/icons";
import type { SchemaProperty, ValueSetter } from "@/app/lib/types/assessment";

interface OutputSchemaStepProps {
  onNext: () => void;
  onBack: () => void;
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}
import { OutputSchemaEditor } from "./OutputSchemaEditor";

export { OutputSchemaModal } from "./OutputSchemaEditor";

export default function OutputSchemaStep({
  schema,
  setSchema,
  onNext,
  onBack,
}: OutputSchemaStepProps) {
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col">
      <div className="flex-1 space-y-5 pb-16">
        <OutputSchemaEditor
          schema={schema}
          setSchema={setSchema}
          description="Leave this empty for free text, or add fields if you want a structured response."
        />
      </div>

      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex items-center justify-between border-t border-border bg-bg-secondary px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="!rounded-lg"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </Button>
          <Button type="button" onClick={onNext} className="!rounded-lg">
            Next: Review
          </Button>
        </div>
      </div>
    </div>
  );
}
