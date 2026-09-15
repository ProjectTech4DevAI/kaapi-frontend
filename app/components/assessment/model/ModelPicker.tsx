"use client";

import { Select } from "@/app/components/ui";
import ConfigParamControl from "@/app/components/assessment/prompt-config/ConfigParamControl";
import {
  PROVIDER_OPTIONS,
  getModelConfigDefinition,
  getModelsByProvider,
} from "@/app/lib/data/assessmentModels";
import type {
  AssessorModelSelection,
  PromptStepId,
} from "@/app/lib/types/assessment";
import type { ProviderType } from "@/app/lib/types/configs";

interface ModelPickerProps {
  step: PromptStepId;
  selection: AssessorModelSelection;
  onModel: (step: PromptStepId, provider: ProviderType, model: string) => void;
  onParam: (step: PromptStepId, key: string, value: string | number) => void;
}

const fieldLabel =
  "block text-[10px] font-semibold tracking-wider uppercase text-text-secondary";

/**
 * Provider → model → that model's own parameters. The parameter set differs per
 * model (a reasoning model takes effort, a chat model takes temperature), so it
 * is read from the catalog rather than hardcoded.
 */
export default function ModelPicker({
  step,
  selection,
  onModel,
  onParam,
}: ModelPickerProps) {
  const models = getModelsByProvider(selection.provider);
  const definition = getModelConfigDefinition(selection.model);

  return (
    <div className="w-[330px] overflow-hidden rounded-xl border border-border bg-bg-primary shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
      <div className="space-y-3 p-3.5">
        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor={`${step}-provider`}>
            Provider
          </label>
          <Select
            id={`${step}-provider`}
            value={selection.provider}
            options={PROVIDER_OPTIONS.map((option) => ({ ...option }))}
            onChange={(event) =>
              onModel(step, event.target.value as ProviderType, "")
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel} htmlFor={`${step}-model`}>
            Model
          </label>
          <Select
            id={`${step}-model`}
            value={selection.model}
            options={models}
            className="font-mono"
            onChange={(event) =>
              onModel(step, selection.provider, event.target.value)
            }
          />
        </div>
      </div>

      <div className="border-t border-border bg-bg-secondary px-3.5 py-3">
        <p className={fieldLabel}>Parameters · {selection.model}</p>
        <div className="mt-2 space-y-3">
          {Object.entries(definition).map(([key, param]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium text-text-primary">
                  {key}
                </span>
                <span className="text-[10px] text-text-secondary">
                  {param.description}
                </span>
              </div>
              <ConfigParamControl
                value={selection.params[key] ?? param.default}
                definition={param}
                onChange={(value) => onParam(step, key, value)}
              />
            </div>
          ))}
          {Object.keys(definition).length === 0 && (
            <p className="text-xs text-text-secondary">
              This model takes no tunable parameters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
