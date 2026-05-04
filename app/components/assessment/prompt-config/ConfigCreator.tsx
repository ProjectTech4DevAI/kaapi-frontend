import { Button, Field } from "@/app/components";
import Select from "@/app/components/Select";
import { PROVIDER_OPTIONS } from "@/app/lib/assessment/constants";
import type {
  ConfigParamDefinition,
  ModelOption,
  ValueSetter,
} from "@/app/lib/types/assessment";

export interface ConfigCreatorProps {
  currentProvider: string;
  currentModel: string;
  providerModels: ModelOption[];
  currentParamDefs: Record<string, ConfigParamDefinition>;
  draftParams: Record<string, string | number | undefined>;
  configName: string;
  commitMessage: string;
  isSaving: boolean;
  setConfigName: ValueSetter<string>;
  setCommitMessage: ValueSetter<string>;
  onProviderChange: ValueSetter<"openai">;
  onModelChange: ValueSetter<string>;
  onParamChange: (key: string, value: string | number) => void;
  onSave: () => void | Promise<void>;
}

interface ConfigParamControlProps {
  value: string | number;
  definition: ConfigParamDefinition;
  onChange: (value: string | number) => void;
}

const inputClass = "!rounded-xl !bg-bg-primary !px-4 !py-3";
const selectClass =
  "w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none focus:ring-1";

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
          <label className="mb-2 block text-xs font-semibold text-text-primary">
            Provider
          </label>
          <Select
            value={currentProvider}
            onChange={(e) => onProviderChange(e.target.value as "openai")}
            className={selectClass}
            options={[...PROVIDER_OPTIONS]}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-text-primary">
            Model
          </label>
          <Select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className={selectClass}
            options={providerModels}
          />
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
        <Field
          label="AI Configuration Name"
          value={configName}
          onChange={setConfigName}
          placeholder="Helpful grader"
          className={inputClass}
        />
        <Field
          label="Save note"
          value={commitMessage}
          onChange={setCommitMessage}
          placeholder="Optional"
          className={inputClass}
        />
      </div>

      <Button
        type="button"
        fullWidth
        onClick={() => void onSave()}
        disabled={saveDisabled}
        className="!rounded-xl !py-3 !font-semibold"
      >
        {isSaving ? "Saving..." : "Save behavior"}
      </Button>
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
      <Select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        options={definition.options.map((option) => ({
          value: option,
          label: option,
        }))}
      />
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
