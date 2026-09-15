"use client";

import EditorStepLayout from "@/app/components/assessment/editor/EditorStepLayout";
import PromptZoneCard from "@/app/components/assessment/editor/PromptZoneCard";
import OutputSchemaEditorInner from "@/app/components/assessment/output-schema/OutputSchemaEditorInner";
import {
  ASSESSMENT_ZONE_COPY,
  ASSESSMENT_ZONE_MIN_HEIGHT,
} from "@/app/lib/assessment/promptCopy";
import type {
  PromptFieldType,
  PromptZoneId,
  PromptZones,
  SchemaProperty,
} from "@/app/lib/types/assessment";

interface AssessmentStepProps {
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  fieldStrict: Record<string, boolean>;
  sampleRow: Record<string, string>;
  outputSchema: SchemaProperty[];
  onZoneChange: (zone: PromptZoneId, value: string) => void;
  onFieldType: (name: string, type: PromptFieldType) => void;
  onFieldStrict: (name: string, strict: boolean) => void;
  onOutputSchema: (schema: SchemaProperty[]) => void;
}

/** Wizard step 3: the assessor's prompt and the schema its answer must fill. */
export default function AssessmentStep({
  zones,
  columns,
  fieldTypes,
  fieldStrict,
  sampleRow,
  outputSchema,
  onZoneChange,
  onFieldType,
  onFieldStrict,
  onOutputSchema,
}: AssessmentStepProps) {
  return (
    <EditorStepLayout
      zones={zones}
      columns={columns}
      fieldTypes={fieldTypes}
      sampleRow={sampleRow}
    >
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Assessment</h2>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Write the assessor like a document: who the AI is, what it assesses,
          what it returns.
        </p>
      </div>

      <PromptZoneCard
        zones={zones}
        copy={ASSESSMENT_ZONE_COPY}
        zoneMinHeight={ASSESSMENT_ZONE_MIN_HEIGHT}
        columns={columns}
        fieldTypes={fieldTypes}
        fieldStrict={fieldStrict}
        onZoneChange={onZoneChange}
        onFieldType={onFieldType}
        onFieldStrict={onFieldStrict}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
        <div className="border-b border-border bg-bg-secondary px-5 py-3">
          <h3 className="text-[11px] font-semibold tracking-wider uppercase text-text-secondary">
            Output schema
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">
            Enforced as structured output — every field becomes a results
            column.
          </p>
        </div>
        <div className="px-5 py-4">
          <OutputSchemaEditorInner
            schema={outputSchema}
            setSchema={onOutputSchema}
          />
        </div>
      </section>
    </EditorStepLayout>
  );
}
