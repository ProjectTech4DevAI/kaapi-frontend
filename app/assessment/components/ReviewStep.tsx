"use client";

import { useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
} from "@/app/components/icons";
import { colors } from "@/app/lib/colors";
import { AssessmentFormState } from "../types";
import { schemaToJsonSchema } from "../schemaUtils";

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
      className="border rounded-lg overflow-hidden"
      style={{
        borderColor: isOpen ? colors.accent.primary : colors.border,
        backgroundColor: colors.bg.primary,
      }}
    >
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors cursor-pointer"
        style={{
          backgroundColor: isOpen
            ? "rgba(59, 130, 246, 0.03)"
            : colors.bg.primary,
        }}
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
            className="w-4 h-4 transition-transform flex-shrink-0"
            style={{
              color: colors.text.secondary,
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: colors.text.primary }}
          >
            {title}
          </span>
          {badge && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: colors.bg.secondary,
                color: colors.text.secondary,
              }}
            >
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
            className="cursor-pointer text-xs font-medium px-2.5 py-1 rounded-md transition-colors"
            style={{
              color: colors.accent.primary,
              backgroundColor: colors.bg.secondary,
            }}
          >
            Edit
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: colors.border }}
        >
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
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.text.primary }}
          >
            Review & Submit
          </h2>
          <p className="text-sm mt-1" style={{ color: colors.text.secondary }}>
            Verify your evaluation configuration before submitting.
          </p>
        </div>

        {/* Experiment Name */}
        <div
          className="border rounded-lg p-4"
          style={{
            borderColor: colors.border,
            backgroundColor: colors.bg.primary,
          }}
        >
          <label
            className="block text-xs font-medium mb-1.5"
            style={{ color: colors.text.secondary }}
          >
            Experiment Name
          </label>
          <input
            type="text"
            value={experimentName}
            onChange={(e) => setExperimentName(e.target.value)}
            placeholder="e.g. GPT-4o vs Claude Sonnet on medical QA"
            className="w-full px-3 py-2 rounded-md text-sm border outline-none transition-colors"
            style={{
              backgroundColor: colors.bg.secondary,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = colors.accent.primary)
            }
            onBlur={(e) => (e.target.style.borderColor = colors.border)}
          />
          <p
            className="text-[11px] mt-1.5"
            style={{ color: colors.text.secondary }}
          >
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
            <div
              className="text-xs font-medium mb-1"
              style={{ color: colors.text.secondary }}
            >
              Dataset Name
            </div>
            <div
              className="text-sm font-medium"
              style={{ color: colors.text.primary }}
            >
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
                <span
                  className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(22, 163, 74, 0.14)",
                    color: "#166534",
                  }}
                >
                  Text
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.textColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex rounded px-2 py-0.5 text-xs font-mono font-medium"
                      style={{
                        backgroundColor: colors.bg.secondary,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {columnMapping.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span
                  className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(249, 115, 22, 0.14)",
                    color: "#9a3412",
                  }}
                >
                  Attachments
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.attachments.map((a) => (
                    <span
                      key={a.column}
                      className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-medium"
                      style={{
                        backgroundColor: colors.bg.secondary,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {a.column}
                      <span
                        className="font-sans text-[10px]"
                        style={{ color: colors.text.secondary }}
                      >
                        ({a.type}, {a.format})
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {columnMapping.groundTruthColumns.length > 0 && (
              <div className="space-y-1.5">
                <span
                  className="inline-flex rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "rgba(59, 130, 246, 0.14)",
                    color: "#1e40af",
                  }}
                >
                  Ground Truth
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {columnMapping.groundTruthColumns.map((col) => (
                    <span
                      key={col}
                      className="inline-flex rounded px-2 py-0.5 text-xs font-mono font-medium"
                      style={{
                        backgroundColor: colors.bg.secondary,
                        color: colors.text.primary,
                        border: `1px solid ${colors.border}`,
                      }}
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
              <pre
                className="text-xs font-mono whitespace-pre-wrap p-3 rounded-md"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.primary,
                }}
              >
                {promptTemplate}
              </pre>
            ) : (
              <div
                className="text-xs rounded-md p-3"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.secondary,
                }}
              >
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
                className="flex items-center gap-3 p-2.5 rounded-md"
                style={{ backgroundColor: colors.bg.secondary }}
              >
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
                  style={{
                    backgroundColor: colors.accent.primary,
                    color: "#fff",
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-sm font-medium"
                    style={{ color: colors.text.primary }}
                  >
                    {config.name}
                  </span>
                  <span
                    className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-medium"
                    style={{
                      backgroundColor: colors.bg.primary,
                      color: colors.text.secondary,
                    }}
                  >
                    v{config.config_version}
                  </span>
                </div>
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: colors.text.secondary }}
                >
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium"
                    style={{
                      backgroundColor: "rgba(139, 92, 246, 0.1)",
                      color: "#6d28d9",
                    }}
                  >
                    {p.name || "(unnamed)"}
                    <span className="font-sans text-[10px] opacity-70">
                      {p.isArray ? `${p.type}[]` : p.type}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <div
                className="text-xs rounded-md p-3"
                style={{
                  backgroundColor: colors.bg.secondary,
                  color: colors.text.secondary,
                }}
              >
                No response format defined — model will return free-form text.
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Request payload (collapsible) */}
        <details className="group">
          <summary
            className="text-xs font-medium cursor-pointer flex items-center gap-1.5 py-1"
            style={{ color: colors.text.secondary }}
          >
            <ChevronRightIcon className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
            View request payload
          </summary>
          <pre
            className="mt-2 text-xs font-mono whitespace-pre-wrap p-3 rounded-md overflow-auto max-h-64"
            style={{
              backgroundColor: colors.bg.secondary,
              color: colors.text.primary,
            }}
          >
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
      <div
        className="mt-auto sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium flex items-center gap-2"
            style={{
              borderColor: colors.border,
              color: colors.text.primary,
              backgroundColor: colors.bg.primary,
            }}
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            {!isSubmitting && !canSubmit && (
              <span
                className="text-xs"
                style={{ color: colors.text.secondary }}
              >
                {submitBlockerMessage}
              </span>
            )}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !canSubmit}
              className="rounded-lg px-8 py-2.5 text-sm font-medium flex items-center gap-2"
              style={{
                backgroundColor:
                  isSubmitting || !canSubmit
                    ? colors.bg.secondary
                    : colors.accent.primary,
                color:
                  isSubmitting || !canSubmit ? colors.text.secondary : "#fff",
                cursor: isSubmitting || !canSubmit ? "not-allowed" : "pointer",
                border: `1px solid ${isSubmitting || !canSubmit ? colors.border : colors.accent.primary}`,
              }}
            >
              {isSubmitting ? (
                <>
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{
                      borderColor: colors.text.secondary,
                      borderTopColor: "transparent",
                    }}
                  />
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
