import { Button, Field, Select } from "@/app/components/ui";
import { PROVIDER_OPTIONS } from "@/app/lib/data/assessmentModels";
import type { ConfigCreatorProps } from "@/app/lib/types/assessment";
import type { CompletionConfig } from "@/app/lib/types/configs";
import ConfigParamControl from "./ConfigParamControl";

const selectClass =
  "w-full rounded-full border border-border bg-bg-primary px-2 py-2 text-sm text-text-primary outline-none focus:ring-1";

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
            onChange={(e) =>
              onProviderChange(e.target.value as CompletionConfig["provider"])
            }
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
        />
        <Field
          label="Save note"
          value={commitMessage}
          onChange={setCommitMessage}
          placeholder="Optional"
        />
      </div>

      <Button
        type="button"
        fullWidth
        onClick={() => void onSave()}
        disabled={saveDisabled}
      >
        {isSaving ? "Saving..." : "Save behavior"}
      </Button>
    </div>
  );
}
