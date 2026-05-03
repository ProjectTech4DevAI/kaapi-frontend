import { PROVIDER_OPTIONS } from "@/app/lib/assessment/config";
import type {
  ConfigCreatorProps,
  ConfigParamControlProps,
} from "@/app/lib/types/assessment";

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
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="mb-2 block text-xs font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Provider
          </label>
          <select
            value={currentProvider}
            onChange={(e) => onProviderChange(e.target.value as "openai")}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-2 block text-xs font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Model
          </label>
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          >
            {providerModels.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <details
        className="rounded-xl border"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--background-secondary)",
        }}
      >
        <summary
          className="cursor-pointer px-4 py-3 text-sm font-semibold"
          style={{ color: "var(--foreground)" }}
        >
          Advanced
        </summary>
        <div className="px-4 pb-4">
          {Object.entries(currentParamDefs).map(([paramKey, definition]) => (
            <div
              key={paramKey}
              className="border-b py-4 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    {paramKey}
                  </div>
                  <div
                    className="mt-1 text-xs leading-5"
                    style={{ color: "var(--muted)" }}
                  >
                    {definition.description}
                  </div>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    backgroundColor: "var(--background)",
                    color: "var(--muted)",
                  }}
                >
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
          <label
            className="mb-2 block text-xs font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            AI Configuration name
          </label>
          <input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Helpful grader"
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>
        <div>
          <label
            className="mb-2 block text-xs font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Save note
          </label>
          <input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      <button
        onClick={() => void onSave()}
        disabled={isSaving || !configName.trim()}
        className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
        style={{
          backgroundColor:
            isSaving || !configName.trim()
              ? "var(--background-secondary)"
              : "var(--foreground)",
          color: isSaving || !configName.trim() ? "var(--muted)" : "#fff",
          cursor: isSaving || !configName.trim() ? "not-allowed" : "pointer",
        }}
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
        className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          color: "var(--foreground)",
        }}
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
      <span
        className="w-12 text-right font-mono text-sm"
        style={{ color: "var(--foreground)" }}
      >
        {definition.type === "int" ? numericValue : numericValue.toFixed(2)}
      </span>
    </div>
  );
}
