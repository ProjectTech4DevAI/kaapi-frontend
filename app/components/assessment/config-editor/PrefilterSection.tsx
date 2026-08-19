"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/app/components/ui";
import CompactToggleSwitch from "../CompactToggleSwitch";
import ModelPanel from "./ModelPanel";
import PromptZoneEditor from "./PromptZoneEditor";
import { useDerivedFields } from "@/app/hooks/useDerivedFields";
import {
  buildDefaultParams,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
} from "@/app/lib/data/assessmentModels";
import {
  PLACEHOLDER_PREFILTER_CRITERIA,
  PLACEHOLDER_PREFILTER_SUBMISSION,
} from "@/app/lib/assessment/placeholders";
import type {
  PrefilterConfig,
  PrefilterSectionProps,
} from "@/app/lib/types/assessment";
import type { CompletionConfig, ProviderType } from "@/app/lib/types/configs";
import type { UseReferenceDatasetResult } from "@/app/hooks/useReferenceDataset";

// Sentinel for "let the backend pick its recommended pre-filter model".
const DEFAULT_MODEL_OPTION = "__default__";

// Pre-filter step (Topic Relevance only), mirroring the Assessment section's
// document: Instructions (the accept/reject criteria) + Submission
// (@-references choosing what to point the AI at). Output is fixed by the
// backend (accepted/rejected + reason), so there is no response-format zone.
export default function PrefilterSection({
  prefilterConfig,
  setPrefilterConfig,
  columnMapping,
  setColumnMapping,
  onNext,
  onBack,
  syncToken,
  reference,
}: PrefilterSectionProps & { reference: UseReferenceDatasetResult }) {
  const tr = prefilterConfig?.topic_relevance;
  const [enabled, setEnabled] = useState(() => !!tr);
  const [criteria, setCriteria] = useState(() => tr?.prompt ?? "");
  const [submission, setSubmission] = useState(
    () => tr?.submission_template ?? "",
  );
  const [provider, setProvider] = useState<ProviderType>(
    () => (tr?.provider as ProviderType) ?? "openai",
  );
  const [model, setModel] = useState(() => tr?.model ?? "");
  const [params, setParams] = useState<Record<string, string | number>>(
    () => tr?.params ?? {},
  );
  const [stopOnFail, setStopOnFail] = useState(() => tr?.stop_on_fail ?? true);

  // Re-seed local state when a config is (re)loaded (keyed on syncToken only,
  // so in-flight edits are not clobbered).
  const propsRef = useRef(prefilterConfig);
  useEffect(() => {
    propsRef.current = prefilterConfig;
  });
  const isFirstSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    const seeded = propsRef.current?.topic_relevance;
    setEnabled(!!seeded);
    setCriteria(seeded?.prompt ?? "");
    setSubmission(seeded?.submission_template ?? "");
    setProvider((seeded?.provider as ProviderType) ?? "openai");
    setModel(seeded?.model ?? "");
    setParams(seeded?.params ?? {});
    setStopOnFail(seeded?.stop_on_fail ?? true);
  }, [syncToken]);

  // Push local edits up live (Review & save reads prefilterConfig even when the
  // user jumps steps without clicking Next).
  useEffect(() => {
    const current = propsRef.current;
    const next: PrefilterConfig = {};
    if (enabled && criteria.trim()) {
      next.topic_relevance = {
        columns: [],
        prompt: criteria.trim(),
        submission_template: submission.trim() || undefined,
        // No explicit model -> the backend's recommended default (which lives
        // under its default provider).
        provider: model ? provider : "openai",
        model: model || undefined,
        params,
        stop_on_fail: stopOnFail,
      };
    }
    if (current?.duplicate_detection) {
      next.duplicate_detection = current.duplicate_detection;
    }
    setPrefilterConfig(Object.keys(next).length > 0 ? next : null);
  }, [
    enabled,
    criteria,
    submission,
    provider,
    model,
    params,
    stopOnFail,
    setPrefilterConfig,
  ]);

  // The Submission zone registers @-referenced columns as fields in the same
  // input schema the Assessment section derives.
  const derived = useDerivedFields({
    columnMapping,
    setColumnMapping,
    promptTemplate: submission,
    setPromptTemplate: setSubmission,
    sampleRow: reference.referenceDataset?.sampleRow ?? {},
  });

  const textFieldNames = columnMapping.textColumns;
  const attachmentFieldNames = columnMapping.attachments.map((a) => a.column);
  const mentionColumns = useMemo(() => {
    const names = new Set([
      ...(reference.referenceDataset?.headers ?? []),
      ...textFieldNames,
      ...attachmentFieldNames,
    ]);
    return [...names];
  }, [attachmentFieldNames, reference.referenceDataset, textFieldNames]);

  const toggleEnabled = () => setEnabled((wasEnabled) => !wasEnabled);

  const providerModels = [
    { value: DEFAULT_MODEL_OPTION, label: "Recommended (managed)" },
    ...getModelsByProvider(provider),
  ];
  const paramDefs = model ? getModelConfigDefinition(model) : {};

  const handleProviderChange = (next: CompletionConfig["provider"]) => {
    const defaultModel = getDefaultModelForProvider(next);
    setProvider(next as ProviderType);
    setModel(defaultModel);
    setParams(buildDefaultParams(defaultModel));
  };

  const handleModelChange = (next: string) => {
    if (next === DEFAULT_MODEL_OPTION) {
      setModel("");
      setProvider("openai");
      setParams({});
      return;
    }
    setModel(next);
    setParams(buildDefaultParams(next));
  };

  const canProceed = !enabled || !!criteria.trim();

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
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Pre-filter
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Optional relevance check before the assessment: submissions that
              don’t match your criteria are rejected with a reason.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              {enabled ? "Relevance check on" : "Relevance check off"}
            </span>
            <CompactToggleSwitch
              checked={enabled}
              onChange={toggleEnabled}
              title="Enable the relevance check"
            />
          </div>
        </div>

        {enabled && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
            <section className="min-w-0 space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
                {zoneHeader(
                  "Instructions",
                  "Same for every submission — what to Accept, what to Reject",
                )}
                <div className="px-5 py-4">
                  <PromptZoneEditor
                    value={criteria}
                    onChange={setCriteria}
                    placeholder={PLACEHOLDER_PREFILTER_CRITERIA}
                    minHeightClass="min-h-[240px]"
                  />
                  {!criteria.trim() && (
                    <p className="mt-2 text-xs text-status-warning-text">
                      Describe your accept/reject criteria to enable this check.
                    </p>
                  )}
                </div>

                {zoneHeader(
                  "Submission",
                  "Per submission row — type @ to reference dataset columns",
                )}
                <div className="px-5 py-4">
                  <PromptZoneEditor
                    value={submission}
                    onChange={setSubmission}
                    placeholder={PLACEHOLDER_PREFILTER_SUBMISSION}
                    minHeightClass="min-h-[120px]"
                    enableMentions
                    mentionColumns={mentionColumns}
                    knownTextFields={textFieldNames}
                    attachmentFields={attachmentFieldNames}
                    onPickAttachment={derived.onPickAttachment}
                    onCreateField={derived.onCreateField}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-3 py-2 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">
                  Output is fixed:
                </span>
                <span className="rounded-full bg-status-success-bg px-2 py-0.5 text-status-success-text">
                  ✓ Accepted
                </span>
                <span className="rounded-full bg-status-error-bg px-2 py-0.5 text-status-error-text">
                  ✗ Rejected
                </span>
                <span>with a reason.</span>
              </div>
            </section>

            <aside className="space-y-4 self-start lg:sticky lg:top-6">
              <div className="rounded-2xl border border-border bg-bg-primary p-4">
                <div className="mb-3 text-sm font-semibold text-text-primary">
                  Model
                </div>
                <ModelPanel
                  provider={provider}
                  model={model || DEFAULT_MODEL_OPTION}
                  providerModels={providerModels}
                  paramDefs={paramDefs}
                  params={params}
                  onProviderChange={handleProviderChange}
                  onModelChange={handleModelChange}
                  onParamChange={(key, value) =>
                    setParams((prev) => ({ ...prev, [key]: value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-bg-primary p-4">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Skip assessment for rejected submissions
                  </div>
                  <div className="mt-0.5 text-xs text-text-secondary">
                    Off: rejected submissions are only flagged and still
                    assessed.
                  </div>
                </div>
                <CompactToggleSwitch
                  checked={stopOnFail}
                  onChange={() => setStopOnFail((v) => !v)}
                  title="Skip assessment for rejected submissions"
                />
              </div>
            </aside>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 border-t border-border bg-bg-secondary px-6 py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              {!enabled
                ? "No pre-filter — every submission is assessed."
                : canProceed
                  ? "Ready to continue."
                  : "Write the criteria (or turn the check off) to continue."}
            </span>
            <Button type="button" onClick={onNext} disabled={!canProceed}>
              Next: Assessment
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
