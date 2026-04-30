"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/app/components/icons";
import PlayIcon from "@/app/components/icons/assessment/PlayIcon";
import { schemaToJsonSchema } from "@/app/assessment/schemaUtils";
import { type AssessmentFormState } from "@/app/assessment/types";

interface ReviewStepProps {
  formState: AssessmentFormState;
  experimentName: string;
  setExperimentName: (name: string) => void;
  isSubmitting: boolean;
  canSubmit: boolean;
  submitBlockerMessage: string;
  onSubmit: () => void;
  onBack: () => void;
  onEditStep: (step: number) => void;
}

interface AccordionSectionProps {
  title: string;
  stepNumber: number;
  isOpen: boolean;
  onToggle: () => void;
  onEdit?: () => void;
  badge?: string;
  children: React.ReactNode;
}

function AccordionSection({
  title,
  isOpen,
  onToggle,
  onEdit,
  badge,
  children,
}: AccordionSectionProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-white ${
        isOpen ? "border-neutral-900" : "border-neutral-200"
      }`}
    >
      <div
        onClick={onToggle}
        className={`w-full cursor-pointer flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
          isOpen ? "bg-blue-500/[0.03]" : "bg-white"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-3">
          {/* Chevron */}
          <ChevronRightIcon
            className={`h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform ${
              isOpen ? "rotate-90" : "rotate-0"
            }`}
          />
          <span className="text-sm font-semibold text-neutral-900">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
              {badge}
            </span>
          )}
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="cursor-pointer rounded-md bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-900 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {isOpen && (
        <div className="border-t border-neutral-200 px-4 pb-4 pt-1">
          {children}
        </div>
      )}
    </div>
  );
}

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
    datasetId,
    datasetName,
    columnMapping,
    promptTemplate,
    outputSchema,
    configs,
  } = formState;
  const [openSections, setOpenSections] = useState<Set<number>>(
    new Set([1, 2, 3, 4, 5]),
  );

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
          <h2 className="text-lg font-semibold text-neutral-900">
            Review & Submit
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Verify your evaluation configuration before submitting.
          </p>
        </div>

        {/* Experiment Name */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <label className="mb-1.5 block text-xs font-medium text-neutral-500">
            Experiment Name
          </label>
          <input
            type="text"
            value={experimentName}
            onChange={(e) => setExperimentName(e.target.value)}
            placeholder="e.g. GPT-4o vs Claude Sonnet on medical QA"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-900"
          />
          <p className="mt-1.5 text-[11px] text-neutral-500">
            A descriptive name to identify this evaluation run.
          </p>
        </div>

        {/* Dataset */}
        <AccordionSection
          title="Dataset"
          stepNumber={1}
          isOpen={openSections.has(1)}
          onToggle={() => toggleSection(1)}
        >
          <div className="pt-2">
            <div className="mb-1 text-xs font-medium text-neutral-500">
              Dataset Name
            </div>
            <div className="text-sm font-medium text-neutral-900">
              {datasetName || "Unknown dataset"}
            </div>
          </div>
        </AccordionSection>

        {/* Column Mapping */}
        <AccordionSection
          title="Column Mapping"
          stepNumber={2}
          isOpen={openSections.has(2)}
          onToggle={() => toggleSection(2)}
          onEdit={() => onEditStep(1)}
          badge={`${columnMapping.textColumns.length + columnMapping.attachments.length + columnMapping.groundTruthColumns.length} mapped`}
        >
          <div className="space-y-3 pt-2">
            {columnMapping.textColumns.length > 0 && (
              <div className="space-y-1.5">
                <span className="inline-flex rounded-md bg-green-600/[0.14] px-2 py-0.5 text-xs font-semibold text-green-800">
                  Text
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.textColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs font-medium text-neutral-900"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {columnMapping.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="inline-flex rounded-md bg-orange-500/[0.14] px-2 py-0.5 text-xs font-semibold text-orange-800">
                  Attachments
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.attachments.map((a) => (
                    <span
                      key={a.column}
                      className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs font-medium text-neutral-900"
                    >
                      {a.column}
                      <span className="font-sans text-[10px] text-neutral-500">
                        ({a.type}, {a.format})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {columnMapping.groundTruthColumns.length > 0 && (
              <div className="space-y-1.5">
                <span className="inline-flex rounded-md bg-blue-500/[0.14] px-2 py-0.5 text-xs font-semibold text-blue-800">
                  Ground Truth
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.groundTruthColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-xs font-medium text-neutral-900"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Prompt Template */}
        <AccordionSection
          title="Prompt Template"
          stepNumber={3}
          isOpen={openSections.has(3)}
          onToggle={() => toggleSection(3)}
          onEdit={() => onEditStep(2)}
          badge={promptTemplate ? "Custom" : "Default"}
        >
          <div className="pt-2">
            {promptTemplate ? (
              <pre className="rounded-md bg-neutral-50 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-900">
                {promptTemplate}
              </pre>
            ) : (
              <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
                No template set — all text columns will be concatenated by the
                backend.
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Configurations */}
        <AccordionSection
          title="Configurations"
          stepNumber={4}
          isOpen={openSections.has(4)}
          onToggle={() => toggleSection(4)}
          onEdit={() => onEditStep(2)}
          badge={`${configs.length} selected`}
        >
          <div className="space-y-2 pt-2">
            {configs.map((config, i) => (
              <div
                key={`${config.config_id}-${config.config_version}`}
                className="flex items-center gap-3 rounded-md bg-neutral-50 p-2.5"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-neutral-900">
                    {config.name}
                  </span>
                  <span className="ml-1.5 rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                    v{config.config_version}
                  </span>
                </div>
                <span className="flex-shrink-0 text-xs text-neutral-500">
                  {config.provider}/{config.model}
                </span>
              </div>
            ))}
          </div>
        </AccordionSection>

        {/* Response Format */}
        <AccordionSection
          title="Response Format"
          stepNumber={5}
          isOpen={openSections.has(5)}
          onToggle={() => toggleSection(5)}
          onEdit={() => onEditStep(2)}
          badge={
            outputSchema.length > 0
              ? `${outputSchema.length} fields`
              : "Free text"
          }
        >
          <div className="pt-2">
            {outputSchema.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {outputSchema.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-2 py-0.5 font-mono text-xs font-medium text-violet-700"
                  >
                    {p.name || "(unnamed)"}
                    <span className="font-sans text-[10px] opacity-70">
                      {p.isArray ? `${p.type}[]` : p.type}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
                No response format defined — model will return free-form text.
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Request payload (collapsible) */}
        <details className="group">
          <summary className="flex cursor-pointer items-center gap-1.5 py-1 text-xs font-medium text-neutral-500">
            <ChevronRightIcon className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            View request payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-neutral-50 p-3 font-mono text-xs whitespace-pre-wrap text-neutral-900">
            {JSON.stringify(
              {
                experiment_name: experimentName,
                dataset_id: datasetId,
                prompt_template: promptTemplate || null,
                text_columns: columnMapping.textColumns,
                attachments: columnMapping.attachments.map(
                  ({ column, type, format }) => ({ column, type, format }),
                ),
                output_schema: schemaToJsonSchema(outputSchema) || null,
                configs: configs.map(({ config_id, config_version }) => ({
                  config_id,
                  config_version,
                })),
              },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
      {/* end flex-1 content */}

      {/* Navigation */}
      <div className="mt-auto sticky bottom-0 z-10 border-t border-neutral-200 bg-neutral-50 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-neutral-900"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {!isSubmitting && !canSubmit && (
              <span className="text-xs text-neutral-500">
                {submitBlockerMessage}
              </span>
            )}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit}
              className={`flex items-center gap-2 rounded-lg border px-8 py-2.5 text-sm font-medium ${
                isSubmitting || !canSubmit
                  ? "cursor-not-allowed border-neutral-200 bg-neutral-50 text-neutral-500"
                  : "cursor-pointer border-neutral-900 bg-neutral-900 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
                  Submitting...
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  Submit Evaluation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
