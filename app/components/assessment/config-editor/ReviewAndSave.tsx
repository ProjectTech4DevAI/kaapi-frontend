"use client";

import { Button, Field, Modal, RadioGroup, Select } from "@/app/components/ui";
import { SCHEMA_TYPE_OPTIONS } from "@/app/lib/assessment/constants";
import { renderTemplateWithSample } from "@/app/lib/utils/assessmentTemplate";
import type { UseConfigEditorResult } from "@/app/hooks/useConfigEditor";
import type {
  ConfigSaveMode,
  PrefilterConfig,
  SchemaProperty,
} from "@/app/lib/types/assessment";

const selectClass =
  "w-full rounded-full border border-border bg-bg-primary px-2 py-2 text-sm text-text-primary outline-none focus:ring-1";

const typeLabel = (type: SchemaProperty["type"]) =>
  SCHEMA_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;

interface ReviewAndSaveProps {
  editor: UseConfigEditorResult;
  systemInstruction: string;
  promptTemplate: string;
  outputSchema: SchemaProperty[];
  prefilterConfig: PrefilterConfig | null;
}

// The save surface: fields read-back, dataset compatibility, the assembled
// prompt preview (instructions -> submission -> response format), pre-filter
// and model summaries, then name/version controls.
export default function ReviewAndSave({
  editor,
  systemInstruction,
  promptTemplate,
  outputSchema,
  prefilterConfig,
}: ReviewAndSaveProps) {
  const {
    isReviewOpen,
    setIsReviewOpen,
    reviewWarnings,
    hasBlockingIssues,
    fields,
    reference,
    sampleRow,
    currentProvider,
    currentModel,
    saveMode,
    setSaveMode,
    versionConfigId,
    setVersionConfigId,
    configName,
    setConfigName,
    commitMessage,
    setCommitMessage,
    existingConfigs,
    isSaving,
    handleSave,
  } = editor;

  const namedSchemaFields = outputSchema.filter((f) => f.name.trim());
  const textFieldNames = fields
    .filter((f) => f.type === "text")
    .map((f) => f.name);
  const hasSample = Object.keys(sampleRow).length > 0;
  const renderedSubmission = hasSample
    ? renderTemplateWithSample(promptTemplate, sampleRow, textFieldNames)
    : promptTemplate;
  const tr = prefilterConfig?.topic_relevance;

  const sectionTitle = (title: string) => (
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
      {title}
    </div>
  );

  return (
    <Modal
      open={isReviewOpen}
      onClose={() => setIsReviewOpen(false)}
      title="Review & save"
      maxWidth="max-w-3xl"
      maxHeight="max-h-[92vh]"
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 pb-4">
        {reviewWarnings.length > 0 && (
          <div className="space-y-1.5">
            {reviewWarnings.map((warning, index) => (
              <div
                key={index}
                className={`rounded-lg px-3 py-2 text-xs ${
                  warning.level === "error"
                    ? "bg-status-error-bg text-status-error-text"
                    : "bg-status-warning-bg text-status-warning-text"
                }`}
              >
                {warning.level === "error" ? "✕ " : "⚠ "}
                {warning.message}
              </div>
            ))}
          </div>
        )}

        <div>
          {sectionTitle("Your dataset needs these columns")}
          <div className="flex flex-wrap gap-2">
            {fields.map((field) => (
              <span
                key={field.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-2.5 py-1 font-mono text-[11px] text-text-primary"
              >
                {field.type === "text" ? "@" : "📎"} {field.name}
                <span className="font-sans text-[10px] text-text-secondary">
                  {field.type === "text" ? "text" : `${field.type} link`}
                </span>
              </span>
            ))}
            {fields.length === 0 && (
              <span className="text-xs text-text-secondary">
                No fields yet.
              </span>
            )}
          </div>
          {reference.referenceDataset && (
            <p className="mt-2 text-xs text-text-secondary">
              Checked against “{reference.referenceDataset.name}” (
              {reference.referenceDataset.headers.length} columns).
            </p>
          )}
        </div>

        <div>
          {sectionTitle("Assembled prompt")}
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="border-b border-border bg-bg-secondary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Instructions (same for every submission)
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-5 text-text-primary">
              {systemInstruction.trim() || "(empty)"}
            </pre>
            <div className="border-y border-border bg-bg-secondary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Submission{" "}
              {hasSample
                ? "(preview with the dataset's first row)"
                : "(per row)"}
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-5 text-text-primary">
              {renderedSubmission.trim() ||
                "(empty — all text columns are sent joined together)"}
            </pre>
            {fields.some((f) => f.type !== "text") && (
              <div className="border-t border-border px-3 py-2 text-[11px] text-text-secondary">
                📎{" "}
                {fields
                  .filter((f) => f.type !== "text")
                  .map((f) => f.name)
                  .join(", ")}{" "}
                delivered as file attachment(s) alongside this prompt.
              </div>
            )}
            <div className="border-t border-border bg-bg-secondary px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
              Response format (enforced as structured output)
            </div>
            <div className="px-3 py-2">
              {namedSchemaFields.length > 0 ? (
                <ul className="space-y-1">
                  {namedSchemaFields.map((field) => (
                    <li
                      key={field.id}
                      className="flex items-center gap-2 text-xs text-text-primary"
                    >
                      <span className="font-mono">{field.name}</span>
                      <span className="text-text-secondary">
                        {typeLabel(field.type)}
                        {field.isArray ? " (list)" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-xs text-status-error-text">
                  No output fields yet — structured output is required.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {sectionTitle("Pre-filter")}
            {tr ? (
              <div className="rounded-xl border border-border px-3 py-2 text-xs text-text-primary">
                <div className="line-clamp-3 whitespace-pre-wrap">
                  {tr.prompt}
                </div>
                {tr.submission_template && (
                  <div className="mt-1 line-clamp-2 whitespace-pre-wrap font-mono text-[11px] text-text-secondary">
                    {tr.submission_template}
                  </div>
                )}
                <div className="mt-1.5 text-text-secondary">
                  Model: {tr.model || "recommended default"} ·{" "}
                  {(tr.stop_on_fail ?? true)
                    ? "rejected submissions are skipped"
                    : "rejected submissions are flagged but still assessed"}
                </div>
              </div>
            ) : (
              <span className="text-xs text-text-secondary">
                None — every submission is assessed.
              </span>
            )}
          </div>
          <div>
            {sectionTitle("Model")}
            <div className="rounded-xl border border-border px-3 py-2 text-xs text-text-primary">
              <span className="rounded-full bg-bg-secondary px-2 py-0.5">
                {currentProvider}
              </span>{" "}
              <span className="font-mono">{currentModel}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <RadioGroup<ConfigSaveMode>
            value={saveMode}
            onChange={setSaveMode}
            ariaLabel="Save mode"
            options={[
              { value: "new", label: "New configuration" },
              { value: "version", label: "New version of existing" },
            ]}
          />
          {saveMode === "new" ? (
            <Field
              label="Configuration name"
              value={configName}
              onChange={setConfigName}
              placeholder="e.g. Social Science paper grading"
            />
          ) : (
            <div>
              <label className="mb-2 block text-xs font-semibold text-text-primary">
                Existing configuration
              </label>
              <Select
                value={versionConfigId}
                placeholder="Select a configuration"
                options={existingConfigs.map((config) => ({
                  value: config.id,
                  label: config.name,
                }))}
                onChange={(event) => setVersionConfigId(event.target.value)}
                className={selectClass}
              />
            </div>
          )}
          <Field
            label="Save note"
            value={commitMessage}
            onChange={setCommitMessage}
            placeholder="Optional — what changed?"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        {hasBlockingIssues && (
          <span className="mr-auto text-xs text-status-error-text">
            Fix the issues marked ✕ to save.
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsReviewOpen(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={
            isSaving ||
            hasBlockingIssues ||
            (saveMode === "version" ? !versionConfigId : !configName.trim())
          }
        >
          {isSaving ? "Saving..." : "Save configuration"}
        </Button>
      </div>
    </Modal>
  );
}
