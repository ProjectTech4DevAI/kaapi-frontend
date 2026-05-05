"use client";

import { useState } from "react";
import {
  INITIAL_REVIEW_OPEN_SECTIONS,
  REVIEW_SECTIONS,
} from "@/app/lib/assessment/constants";
import type {
  AssessmentFormState,
  ValueSetter,
} from "@/app/lib/types/assessment";
import { buildMappedColumns } from "@/app/lib/utils/assessment";

interface ReviewStepProps {
  formState: AssessmentFormState;
  experimentName: string;
  setExperimentName: ValueSetter<string>;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: ValueSetter<number>;
}
import ColumnsReview from "./review/ColumnsReview";
import ConfigsReview from "./review/ConfigsReview";
import DatasetReview from "./review/DatasetReview";
import ExperimentReview from "./review/ExperimentReview";
import InputReview from "./review/InputReview";
import SchemaReview from "./review/SchemaReview";
import SubmitReview from "./review/SubmitReview";

export default function ReviewStep({
  formState,
  experimentName,
  setExperimentName,
  isSubmitting,
  canSubmit,
  submitBlockerMessage,
  onSubmit,
  onBack,
  onEditStep,
}: ReviewStepProps) {
  const {
    datasetName,
    columnMapping,
    systemInstruction,
    promptTemplate,
    outputSchema,
    configs,
  } = formState;
  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(INITIAL_REVIEW_OPEN_SECTIONS),
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
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 pb-8">
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
