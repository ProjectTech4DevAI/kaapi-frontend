import { PROVIDER_OPTIONS } from "@/app/lib/assessment/config";
import type {
  ConfigCreatorProps,
  ConfigParamControlProps,
} from "@/app/lib/types/assessment";

const labelClass = "mb-2 block text-xs font-semibold text-text-primary";
const inputClass =
  "w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none";

export default function ConfigCreator({
  currentProvider,
  currentModel,
  providerModels,
  currentParamDefs,
  draftParams,
  configName,
  commitMessage,
  isSaving,
  setConfigName,
  setCommitMessage,
  onProviderChange,
  onModelChange,
  onParamChange,
  onSave,
}: ConfigCreatorProps) {
  const saveDisabled = isSaving || !configName.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Provider</label>
          <select
            value={currentProvider}
            onChange={(e) => onProviderChange(e.target.value as "openai")}
            className={inputClass}
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Model</label>
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className={inputClass}
          >
            {providerModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details className="rounded-xl border border-border bg-bg-secondary">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-text-primary">
          Advanced
        </summary>
        <div className="px-4 pb-4">
          {Object.entries(currentParamDefs).map(([paramKey, definition]) => (
            <div
              key={paramKey}
              className="border-b border-border py-4 last:border-b-0"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {paramKey}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-text-secondary">
                    {definition.description}
                  </div>
                </div>
                <span className="rounded-full bg-bg-primary px-2 py-0.5 text-[11px] text-text-secondary">
                  {String(definition.default)}
                </span>
              </div>
              <ConfigParamControl
                value={draftParams[paramKey] ?? definition.default}
                definition={definition}
                onChange={(value) => onParamChange(paramKey, value)}
              />
            </div>
          ))}
        </div>
      </details>

      <div className="grid gap-3">
        <div>
          <label className={labelClass}>AI Configuration name</label>
          <input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Helpful grader"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Save note</label>
          <input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>

      <button
        onClick={() => void onSave()}
        disabled={saveDisabled}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
          saveDisabled
            ? "cursor-not-allowed bg-neutral-200 text-text-secondary"
            : "cursor-pointer bg-accent-primary text-white hover:bg-accent-hover"
        }`}
      >
        {isSaving ? "Saving..." : "Save behavior"}
      </button>
    </div>
  );
}

function ConfigParamControl({
  value,
  definition,
  onChange,
}: ConfigParamControlProps) {
  if (definition.type === "enum" && definition.options) {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {definition.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={definition.min ?? 0}
        max={definition.max ?? 2}
        step={definition.type === "int" ? 1 : 0.01}
        value={numericValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
      />
      <span className="w-12 text-right font-mono text-sm text-text-primary">
        {definition.type === "int" ? numericValue : numericValue.toFixed(2)}
      </span>
    </div>
  );
}
