"use client";

import { useState } from "react";
import type { ReviewColumn, ReviewStepProps } from "@/app/lib/types/assessment";
import ColumnsReview from "./review/ColumnsReview";
import ConfigsReview from "./review/ConfigsReview";
import DatasetReview from "./review/DatasetReview";
import ExperimentReview from "./review/ExperimentReview";
import InputReview from "./review/InputReview";
import PayloadReview from "./review/PayloadReview";
import SchemaReview from "./review/SchemaReview";
import SubmitReview from "./review/SubmitReview";

const REVIEW_SECTIONS = {
  dataset: 1,
  columns: 2,
  input: 3,
  configs: 4,
  schema: 5,
} as const;

const INITIAL_OPEN_SECTIONS = new Set<number>(Object.values(REVIEW_SECTIONS));

function buildMappedColumns({
  textColumns,
  attachments,
  groundTruthColumns,
}: ReviewStepProps["formState"]["columnMapping"]): ReviewColumn[] {
  return [
    ...textColumns.map((column) => ({
      key: `text:${column}`,
      column,
      role: "text" as const,
      badgeClass: "bg-status-success-bg text-status-success-text",
    })),
    ...attachments.map(({ column }) => ({
      key: `attachment:${column}`,
      column,
      role: "attachment" as const,
      badgeClass: "bg-status-warning-bg text-status-warning-text",
    })),
    ...groundTruthColumns.map((column) => ({
      key: `ground_truth:${column}`,
      column,
      role: "ground truth" as const,
      badgeClass: "bg-accent-subtle/30 text-accent-primary",
    })),
  ];
}

export default function ReviewStep({
  formState,
  experimentName,
  setExperimentName,
  isSubmitting,
  canSubmit,
  outputSchemaJson,
  submitBlockerMessage,
  onSubmit,
  onBack,
  onEditStep,
}: ReviewStepProps) {
  const {
    datasetId,
    datasetName,
    columnMapping,
    systemInstruction,
    promptTemplate,
    outputSchema,
    configs,
  } = formState;
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(INITIAL_OPEN_SECTIONS),
  );

  const mappedColumns = buildMappedColumns(columnMapping);
  const mappedColumnCount =
    columnMapping.textColumns.length +
    columnMapping.attachments.length +
    columnMapping.groundTruthColumns.length;

  const toggleSection = (section: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4">
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-text-primary">
            Review & Submit
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Verify your evaluation configuration before submitting.
          </p>
        </div>

        <ExperimentReview
          experimentName={experimentName}
          setExperimentName={setExperimentName}
        />

        <DatasetReview
          datasetName={datasetName}
          isOpen={openSections.has(REVIEW_SECTIONS.dataset)}
          onToggle={() => toggleSection(REVIEW_SECTIONS.dataset)}
        />

        <ColumnsReview
          mappedColumns={mappedColumns}
          mappedCount={mappedColumnCount}
          isOpen={openSections.has(REVIEW_SECTIONS.columns)}
          onToggle={() => toggleSection(REVIEW_SECTIONS.columns)}
          onEdit={() => onEditStep(1)}
        />

        <InputReview
          systemInstruction={systemInstruction}
          promptTemplate={promptTemplate}
          isOpen={openSections.has(REVIEW_SECTIONS.input)}
          onToggle={() => toggleSection(REVIEW_SECTIONS.input)}
        />

        <ConfigsReview
          configs={configs}
          isOpen={openSections.has(REVIEW_SECTIONS.configs)}
          onToggle={() => toggleSection(REVIEW_SECTIONS.configs)}
          onEdit={() => onEditStep(2)}
        />

        <SchemaReview
          outputSchema={outputSchema}
          isOpen={openSections.has(REVIEW_SECTIONS.schema)}
          onToggle={() => toggleSection(REVIEW_SECTIONS.schema)}
          onEdit={() => onEditStep(2)}
        />

        <PayloadReview
          experimentName={experimentName}
          datasetId={datasetId}
          systemInstruction={systemInstruction}
          promptTemplate={promptTemplate}
          columnMapping={columnMapping}
          outputSchemaJson={outputSchemaJson}
          configs={configs}
        />
      </div>

      <SubmitReview
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        submitBlockerMessage={submitBlockerMessage}
        onSubmit={onSubmit}
        onBack={onBack}
      />
    </div>
  );
}
