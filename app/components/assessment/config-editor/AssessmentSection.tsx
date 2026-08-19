"use client";

import { useMemo } from "react";
import { Button } from "@/app/components/ui";
import { ChevronLeftIcon } from "@/app/components/icons";
import { useConfigEditor } from "@/app/hooks/useConfigEditor";
import {
  PLACEHOLDER_ASSESSMENT_INSTRUCTIONS,
  PLACEHOLDER_ASSESSMENT_SUBMISSION,
} from "@/app/lib/assessment/placeholders";
import type { AssessmentSectionProps } from "@/app/lib/types/assessment";
import type { UseReferenceDatasetResult } from "@/app/hooks/useReferenceDataset";
import FieldsCard from "./FieldsCard";
import ModelPanel from "./ModelPanel";
import PromptZoneEditor from "./PromptZoneEditor";
import ResponseFormatBlock from "./ResponseFormatBlock";
import ReviewAndSave from "./ReviewAndSave";

// The Assessment step: one continuous prompt document on the left
// (Instructions -> Submission -> Response format, mirroring how the final
// prompt is assembled) and the model + fields panels on the right.
export default function AssessmentSection(
  props: AssessmentSectionProps & { reference: UseReferenceDatasetResult },
) {
  const {
    systemInstruction,
    setSystemInstruction,
    promptTemplate,
    setPromptTemplate,
    outputSchema,
    setOutputSchema,
    prefilterConfig,
    columnMapping,
    onBack,
    reference,
  } = props;

  const editor = useConfigEditor(props);
  const {
    fields,
    setFieldType,
    addField,
    removeField,
    clearAllFields,
    onPickAttachment,
    onCreateField,
    currentProvider,
    currentModel,
    providerModels,
    currentParamDefs,
    draftParams,
    handleProviderChange,
    handleModelChange,
    updateDraftParam,
    setIsReviewOpen,
  } = editor;

  const textFieldNames = columnMapping.textColumns;
  const attachmentFieldNames = columnMapping.attachments.map((a) => a.column);
  // @ offers the reference dataset's columns plus every declared field (so a
  // loaded config is editable without re-selecting a dataset).
  const mentionColumns = useMemo(() => {
    const names = new Set([
      ...(reference.referenceDataset?.headers ?? []),
      ...textFieldNames,
      ...attachmentFieldNames,
    ]);
    return [...names];
  }, [attachmentFieldNames, reference.referenceDataset, textFieldNames]);

  const zoneHeader = (title: string, hint: string) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-bg-secondary px-5 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </span>
      <span className="text-[11px] text-text-secondary">{hint}</span>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 pb-20">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Assessment
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Write your assessment prompt like a document: who the AI is, what it
            assesses in each submission, and what it should return.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <section className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
              {zoneHeader(
                "Instructions",
                "Same for every submission — rubric, marking scheme, model answers",
              )}
              <div className="px-5 py-4">
                <PromptZoneEditor
                  value={systemInstruction}
                  onChange={setSystemInstruction}
                  placeholder={PLACEHOLDER_ASSESSMENT_INSTRUCTIONS}
                  minHeightClass="min-h-[420px]"
                />
              </div>

              {zoneHeader(
                "Submission",
                "Per submission row — type @ to reference dataset columns",
              )}
              <div className="px-5 py-4">
                <PromptZoneEditor
                  value={promptTemplate}
                  onChange={setPromptTemplate}
                  placeholder={PLACEHOLDER_ASSESSMENT_SUBMISSION}
                  minHeightClass="min-h-[180px]"
                  enableMentions
                  mentionColumns={mentionColumns}
                  knownTextFields={textFieldNames}
                  attachmentFields={attachmentFieldNames}
                  onPickAttachment={onPickAttachment}
                  onCreateField={onCreateField}
                />
              </div>
            </div>

            <ResponseFormatBlock
              schema={outputSchema}
              setSchema={setOutputSchema}
            />
          </section>

          <aside className="space-y-4 self-start lg:sticky lg:top-6">
            <div className="rounded-2xl border border-border bg-bg-primary p-4">
              <div className="mb-3 text-sm font-semibold text-text-primary">
                Model
              </div>
              <ModelPanel
                provider={currentProvider}
                model={currentModel}
                providerModels={providerModels}
                paramDefs={currentParamDefs}
                params={draftParams}
                onProviderChange={handleProviderChange}
                onModelChange={handleModelChange}
                onParamChange={updateDraftParam}
              />
            </div>

            <FieldsCard
              fields={fields}
              onTypeChange={setFieldType}
              onRemove={removeField}
              onAdd={addField}
              onClearAll={clearAllFields}
            />
          </aside>
        </div>
      </div>

      <ReviewAndSave
        editor={editor}
        systemInstruction={systemInstruction}
        promptTemplate={promptTemplate}
        outputSchema={outputSchema}
        prefilterConfig={prefilterConfig}
      />

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 border-t border-border bg-bg-secondary px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            <ChevronLeftIcon className="h-3.5 w-3.5" />
            Back
          </Button>
          <Button type="button" size="lg" onClick={() => setIsReviewOpen(true)}>
            Review & save
          </Button>
        </div>
      </div>
    </div>
  );
}
