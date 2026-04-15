import { useEffect, useState } from "react";
import { Validator, formatValidatorName } from "@/app/lib/types/guardrails";
import InfoTooltip from "@/app/components/InfoTooltip";
import {
  VALIDATOR_META_BY_TYPE,
  GUARDRAILS_FIELD_TOOLTIPS,
} from "@/app/lib/data/guardrails/validators";
import Button from "@/app/components/Button";
import Field from "@/app/components/Field";
import { buildDefaultValues } from "@/app/lib/utils/guardrails";
import BanListField from "@/app/components/guardrails/BanListField";
import SchemaField from "@/app/components/guardrails/SchemaField";

const inputClass =
  "w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-1";

interface ValidatorConfigPanelProps {
  validators: Validator[];
  validatorsLoading?: boolean;
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  existingValues?: Record<string, unknown> | null;
  existingName?: string;
  isSaving: boolean;
  onSave: (name: string, configValues: Record<string, unknown>) => void;
  onClear: () => void;
}

export default function ValidatorConfigPanel({
  validators,
  validatorsLoading,
  selectedType,
  onTypeChange,
  existingValues,
  existingName,
  isSaving,
  onSave,
  onClear,
}: ValidatorConfigPanelProps) {
  const [configName, setConfigName] = useState("");
  const [stage, setStage] = useState<"input" | "output">("output");
  const [onFailAction, setOnFailAction] = useState("fix");
  const [isEnabled, setIsEnabled] = useState(true);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});

  const validator = selectedType
    ? (validators.find((v) => v.type === selectedType) ?? null)
    : null;

  useEffect(() => {
    if (existingValues != null) {
      setConfigName(existingName ?? "");
      setStage((existingValues.stage as "input" | "output") ?? "output");
      setOnFailAction((existingValues.on_fail_action as string) ?? "fix");
      setIsEnabled((existingValues.is_enabled as boolean) ?? true);
      const {
        stage: _s,
        on_fail_action: _o,
        is_enabled: _i,
        ...rest
      } = existingValues;
      setFieldValues(
        validator
          ? Object.keys(rest).length > 0
            ? rest
            : buildDefaultValues(validator.config)
          : {},
      );
    } else if (validator) {
      // Type changed with no saved config — only reset dynamic fields, leave static fields alone
      setFieldValues(buildDefaultValues(validator.config));
    } else {
      setConfigName("");
      setStage("output");
      setOnFailAction("fix");
      setIsEnabled(true);
      setFieldValues({});
    }
  }, [selectedType, existingValues, existingName, validator]);

  const typeDescription = selectedType
    ? (VALIDATOR_META_BY_TYPE[selectedType]?.description ?? null)
    : null;
  const isBanList = selectedType === "ban_list";

  const editableProperties = validator
    ? Object.entries(validator.config.properties).filter(([key]) => {
        if (key === "type") return false;
        if (key === "on_fail") return false;
        if (key === "validator_metadata" || key === "metadata") return false;
        if (isBanList && (key === "banned_words" || key === "ban_list_id"))
          return false;
        return true;
      })
    : [];

  const handleFieldChange = (name: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const EXCLUDED_KEYS = new Set([
      "on_fail",
      "validator_metadata",
      "metadata",
      "type",
    ]);
    const cleanFieldValues = Object.fromEntries(
      Object.entries(fieldValues).filter(([k]) => !EXCLUDED_KEYS.has(k)),
    );

    const payload: Record<string, unknown> = {
      name: configName,
      type: selectedType,
      stage,
      on_fail_action: onFailAction,
      is_enabled: isEnabled,
      ...cleanFieldValues,
    };
    onSave(configName, payload);
  };

  const hasContent = selectedType || configName;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div>
          <div className="text-sm font-semibold text-text-primary">
            {existingName ? `${existingName}` : "New Validator Config"}
          </div>
          {!existingName && (
            <div className="text-xs text-text-secondary">
              Configure and save a validator
            </div>
          )}
        </div>
        {hasContent && !existingName && (
          <button
            onClick={onClear}
            className="text-xs px-2.5 py-1 rounded border border-border text-text-secondary bg-bg-primary hover:bg-bg-secondary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Field
          label="Config Name"
          value={configName}
          onChange={setConfigName}
          placeholder="e.g. my-pii-remover-config"
        />

        <div>
          <label className="block text-xs font-medium mb-1 text-text-primary">
            Stage
            <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.stage} />
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as "input" | "output")}
            className={inputClass}
          >
            <option value="input">Input</option>
            <option value="output">Output</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-text-primary">
            On Fail Action
            <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.on_fail_action} />
          </label>
          <select
            value={onFailAction}
            onChange={(e) => setOnFailAction(e.target.value)}
            className={inputClass}
          >
            <option value="fix">Fix</option>
            <option value="exception">Exception</option>
            <option value="rephrase">Rephrase</option>
          </select>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-text-primary">Enabled</span>
        </label>

        <div className="border-t border-border pt-3">
          <label className="block text-xs font-medium mb-1 text-text-primary">
            Validator Type
            <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.validator_type} />
          </label>
          {validatorsLoading ? (
            <div className="h-8 rounded-md animate-pulse bg-bg-secondary" />
          ) : (
            <select
              value={selectedType ?? ""}
              onChange={(e) => onTypeChange(e.target.value || null)}
              className={inputClass}
            >
              <option value="">Select a validator type…</option>
              {validators.map((v) => (
                <option key={v.type} value={v.type}>
                  {VALIDATOR_META_BY_TYPE[v.type]?.validator_name ??
                    formatValidatorName(v.type)}
                </option>
              ))}
            </select>
          )}
          {typeDescription && (
            <p className="text-xs mt-1.5 text-text-secondary">
              {typeDescription}
            </p>
          )}
        </div>

        {validator && (
          <>
            {isBanList && (
              <div className="border-t border-border pt-3">
                <BanListField
                  value={(fieldValues["ban_list_id"] as string | null) ?? null}
                  onChange={(id) => handleFieldChange("ban_list_id", id)}
                />
              </div>
            )}

            {editableProperties.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="space-y-4">
                  {editableProperties.map(([key, prop]) => (
                    <SchemaField
                      key={key}
                      name={key}
                      schema={prop}
                      defs={validator.config.$defs}
                      value={fieldValues[key]}
                      onChange={handleFieldChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border shrink-0">
        <Button
          onClick={handleSave}
          disabled={isSaving || !configName.trim() || !selectedType}
          fullWidth
        >
          {isSaving ? "Saving…" : "Save Config"}
        </Button>
      </div>
    </div>
  );
}
