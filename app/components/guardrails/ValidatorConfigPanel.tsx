import { useEffect, useState } from "react";
import { Validator, formatValidatorName } from "@/app/lib/types/guardrails";
import {
  Button,
  Field,
  InfoTooltip,
  Select,
  MultiSelect,
  Loader,
} from "@/app/components/ui";
import { CloseIcon } from "@/app/components/icons";
import {
  GUARDRAILS_FIELD_TOOLTIPS,
  KNOWN_ARRAY_OPTIONS,
  VALIDATOR_DEFAULT_VALUES,
} from "@/app/lib/data/guardrails/validators";
import {
  buildDefaultValues,
  VALIDATOR_META_BY_TYPE,
} from "@/app/lib/utils/guardrails";
import BanListField from "@/app/components/guardrails/BanListField";
import TopicRelevanceField from "@/app/components/guardrails/TopicRelevanceField";
import SchemaField from "@/app/components/guardrails/SchemaField";

interface ValidatorConfigPanelProps {
  validators: Validator[];
  validatorsLoading?: boolean;
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  existingValues?: Record<string, unknown> | null;
  existingName?: string;
  isSaving: boolean;
  onSave: (configValues: Record<string, unknown>) => void;
  onClear: () => void;
  readOnly?: boolean;
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
  readOnly = false,
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
            : {
                ...(VALIDATOR_DEFAULT_VALUES[validator.type] ?? {}),
                ...buildDefaultValues(validator.config),
              }
          : {},
      );
    } else if (validator) {
      // Type changed with no saved config — only reset dynamic fields, leave static fields alone
      setFieldValues({
        ...(VALIDATOR_DEFAULT_VALUES[validator.type] ?? {}),
        ...buildDefaultValues(validator.config),
      });
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
  const isLlamaGuard = selectedType === "llamaguard_7b";
  const isTopicRelevance = selectedType === "topic_relevance";

  const editableProperties = validator
    ? Object.entries(validator.config.properties).filter(([key]) => {
        if (key === "type") return false;
        if (key === "on_fail") return false;
        if (key === "validator_metadata" || key === "metadata") return false;
        if (isBanList && (key === "banned_words" || key === "ban_list_id"))
          return false;
        if (isLlamaGuard && key === "policies") return false;
        if (
          isTopicRelevance &&
          (key === "topic_relevance_config_id" ||
            key === "prompt_schema_version" ||
            key === "configuration")
        )
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
      name: configName.trim(),
      type: selectedType,
      stage,
      on_fail_action: onFailAction,
      is_enabled: isEnabled,
      ...cleanFieldValues,
    };
    onSave(payload);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-primary">
      <div className="border-b border-border px-4 py-3 shrink-0 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary truncate">
            {existingName ? existingName : "New Validator Config"}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {readOnly
              ? "Viewing this validator configuration (read-only)"
              : existingName
                ? "Update this validator configuration"
                : "Configure and save a validator"}
          </p>
        </div>
        {readOnly && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Close"
            title="Close"
            className="shrink-0 p-1 rounded-md text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        <fieldset
          disabled={readOnly}
          className="space-y-4 m-0 p-0 border-0 min-w-0 read-only-fields"
        >
          <Field
            label="Config Name *"
            value={configName}
            onChange={setConfigName}
            placeholder="e.g. my-pii-remover-config"
          />

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Stage
              <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.stage} />
            </label>
            <Select
              value={stage}
              onChange={(e) => setStage(e.target.value as "input" | "output")}
              options={[
                { value: "input", label: "Input" },
                { value: "output", label: "Output" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              On Fail Action
              <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.on_fail_action} />
            </label>
            <Select
              value={onFailAction}
              onChange={(e) => setOnFailAction(e.target.value)}
              options={[
                { value: "fix", label: "Fix" },
                { value: "exception", label: "Exception" },
                { value: "rephrase", label: "Rephrase" },
              ]}
            />
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

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Validator Type *
              <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.validator_type} />
            </label>
            {validatorsLoading ? (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-secondary"
                role="status"
                aria-live="polite"
              >
                <Loader size="sm" />
                <span>Loading validator types…</span>
              </div>
            ) : (
              <Select
                value={selectedType ?? ""}
                onChange={(e) => onTypeChange(e.target.value || null)}
                placeholder="Select a validator type…"
                options={validators.map((v) => ({
                  value: v.type,
                  label:
                    VALIDATOR_META_BY_TYPE[v.type]?.validator_name ??
                    formatValidatorName(v.type),
                }))}
              />
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
                <div>
                  <BanListField
                    value={
                      (fieldValues["ban_list_id"] as string | null) ?? null
                    }
                    onChange={(id) => handleFieldChange("ban_list_id", id)}
                  />
                </div>
              )}

              {isTopicRelevance && (
                <div>
                  <TopicRelevanceField
                    value={
                      (fieldValues["topic_relevance_config_id"] as
                        | string
                        | null) ?? null
                    }
                    onChange={(id) =>
                      handleFieldChange("topic_relevance_config_id", id)
                    }
                    disabled={readOnly}
                  />
                </div>
              )}

              {isLlamaGuard && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Policies
                    <InfoTooltip text={GUARDRAILS_FIELD_TOOLTIPS.policies} />
                  </label>
                  <MultiSelect
                    options={KNOWN_ARRAY_OPTIONS.policies}
                    value={
                      Array.isArray(fieldValues["policies"])
                        ? (fieldValues["policies"] as string[])
                        : []
                    }
                    onChange={(v) =>
                      handleFieldChange("policies", v.length > 0 ? v : null)
                    }
                    placeholder="Select policies…"
                    disabled={readOnly}
                  />
                </div>
              )}

              {editableProperties.length > 0 && (
                <div>
                  <div className="space-y-4">
                    {editableProperties.map(([key, prop]) => (
                      <SchemaField
                        key={key}
                        name={key}
                        schema={prop}
                        defs={validator.config.$defs}
                        value={fieldValues[key]}
                        onChange={handleFieldChange}
                        validatorType={selectedType ?? undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </fieldset>

        {!readOnly && (
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="outline" size="md" onClick={onClear}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving || !configName.trim() || !selectedType}
            >
              {isSaving ? "Saving…" : "Save Config"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
