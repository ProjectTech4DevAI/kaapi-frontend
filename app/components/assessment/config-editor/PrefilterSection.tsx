"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/app/components/ui";
import CompactToggleSwitch from "../CompactToggleSwitch";
import ModelPanel from "./ModelPanel";
import PromptZoneEditor from "./PromptZoneEditor";
import {
  buildDefaultParams,
  getDefaultModelForProvider,
  getModelConfigDefinition,
  getModelsByProvider,
} from "@/app/lib/data/assessmentModels";
import { PLACEHOLDER_PREFILTER_RELEVANCE } from "@/app/lib/assessment/placeholders";
import type {
  PrefilterConfig,
  PrefilterSectionProps,
} from "@/app/lib/types/assessment";
import type { CompletionConfig, ProviderType } from "@/app/lib/types/configs";

// Sentinel for "let the backend pick its recommended pre-filter model".
const DEFAULT_MODEL_OPTION = "__default__";

// Pre-filter step (Topic Relevance only): one criteria editor on the left, the
// model panel on the right. Output is fixed by the backend (accepted/rejected
// + reason), so there is no response-format editor here. Every column's
// content is shared with the pre-filter automatically, so no @-references.
export default function PrefilterSection({
  prefilterConfig,
  setPrefilterConfig,
  onNext,
  onBack,
  syncToken,
}: PrefilterSectionProps) {
  const tr = prefilterConfig?.topic_relevance;
  const [enabled, setEnabled] = useState(() => !!tr);
  const [prompt, setPrompt] = useState(() => tr?.prompt ?? "");
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
    setPrompt(seeded?.prompt ?? "");
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
    if (enabled && prompt.trim()) {
      next.topic_relevance = {
        columns: [],
        prompt: prompt.trim(),
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
    prompt,
    provider,
    model,
    params,
    stopOnFail,
    setPrefilterConfig,
  ]);

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

  const canProceed = !enabled || !!prompt.trim();

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 pb-16">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            Pre-filter
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Optional relevance check before grading: submissions that don’t
            match your criteria are rejected with a reason.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-semibold text-text-primary">
                Relevance check
              </div>
              <div className="mt-0.5 text-xs text-text-secondary">
                Each submission’s text and attached files are shared with the AI
                automatically.
              </div>
            </div>
            <CompactToggleSwitch
              checked={enabled}
              onChange={() => setEnabled((v) => !v)}
              title="Enable the relevance check"
            />
          </div>

          {enabled && (
            <div className="grid gap-6 border-t border-border px-5 pb-5 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
              <div className="min-w-0 space-y-3">
                <PromptZoneEditor
                  value={prompt}
                  onChange={setPrompt}
                  placeholder={PLACEHOLDER_PREFILTER_RELEVANCE}
                  minHeightClass="min-h-[320px]"
                />
                {!prompt.trim() && (
                  <p className="text-xs text-status-warning-text">
                    Describe your accept/reject criteria to enable this check.
                  </p>
                )}
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
              </div>

              <aside className="space-y-4 self-start">
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
                      Skip grading for rejected submissions
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">
                      Off: rejected submissions are only flagged and still
                      graded.
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
      </div>

      <div className="sticky bottom-0 z-10 mt-auto -mx-6 border-t border-border bg-bg-secondary px-6 py-3">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              {!enabled
                ? "No pre-filter — every submission is graded."
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
