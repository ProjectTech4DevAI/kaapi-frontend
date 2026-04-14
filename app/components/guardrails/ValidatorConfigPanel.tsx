import React, { useEffect, useState } from "react";
import {
  Validator,
  ValidatorConfigSchema,
  ValidatorMeta,
  formatValidatorName,
} from "@/app/lib/types/guardrails";
import BanListModal from "./BanListModal";
import MultiSelect from "../MultiSelect";
import InfoTooltip from "@/app/components/InfoTooltip";
import validatorMeta from "./validators.json";
import Button from "@/app/components/Button";
import Field from "@/app/components/Field";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";

const metaMap: Record<string, ValidatorMeta> = (
  validatorMeta as ValidatorMeta[]
).reduce((acc, v) => ({ ...acc, [v.validator_type]: v }), {});

// Known multi-select options keyed by field name
const KNOWN_ARRAY_OPTIONS: Record<string, string[]> = {
  entity_types: [
    "CREDIT_CARD",
    "EMAIL_ADDRESS",
    "IBAN_CODE",
    "IP_ADDRESS",
    "LOCATION",
    "MEDICAL_LICENSE",
    "NRP",
    "PERSON",
    "PHONE_NUMBER",
    "URL",
    "IN_AADHAAR",
    "IN_PAN",
    "IN_PASSPORT",
    "IN_VEHICLE_REGISTRATION",
    "IN_VOTER",
  ],
  languages: ["en", "hi"],
};

// Single-select overrides for fields that are technically arrays but only one value makes sense
const KNOWN_SINGLE_OPTIONS: Record<string, string[]> = {
  categories: ["generic", "healthcare", "education", "all"],
};

const FIELD_TOOLTIPS: Record<string, string> = {
  stage:
    'Where this validator runs — "input" checks the user\'s message before it reaches the LLM, "output" checks the LLM\'s response before it is returned.',
  on_fail_action:
    '"fix" attempts to auto-remediate the violation, "exception" raises an error and blocks the response, "rephrase" asks the model to rewrite the output.',
};

const inputClass =
  "w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-1";

interface BanList {
  id: string;
  name: string;
}

function BanListField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [banLists, setBanLists] = useState<BanList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);

  const fetchBanLists = () => {
    setLoading(true);

    guardrailsFetch<{
      data?: { ban_lists?: BanList[] } | BanList[];
      ban_lists?: BanList[];
    }>("/api/guardrails/ban_lists")
      .then((data) => {
        const nested = data?.data;
        const list: BanList[] = Array.isArray(
          (nested as { ban_lists?: BanList[] })?.ban_lists,
        )
          ? (nested as { ban_lists: BanList[] }).ban_lists
          : Array.isArray(nested)
            ? (nested as BanList[])
            : Array.isArray(data?.ban_lists)
              ? data.ban_lists!
              : [];
        setBanLists(list);
      })
      .catch(() => setBanLists([]))
      .finally(() => setLoading(false));
  };

  const fetchBannedWords = (id: string) => {
    setWordsLoading(true);
    setBannedWords([]);

    guardrailsFetch<{
      banned_words?: string[];
      data?: { banned_words?: string[] };
    }>(`/api/guardrails/ban_lists/${id}`)
      .then((data) => {
        const words: string[] = Array.isArray(data?.banned_words)
          ? data.banned_words!
          : Array.isArray(data?.data?.banned_words)
            ? data.data!.banned_words!
            : [];
        setBannedWords(words);
      })
      .catch(() => setBannedWords([]))
      .finally(() => setWordsLoading(false));
  };

  useEffect(() => {
    fetchBanLists();
  }, []);

  useEffect(() => {
    if (value) {
      fetchBannedWords(value);
    } else {
      setBannedWords([]);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === "__create__") {
      setShowModal(true);
    } else {
      onChange(e.target.value || null);
    }
  };

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1 text-text-primary">
          Ban List
        </label>
        {loading ? (
          <div className="h-8 rounded-md animate-pulse bg-bg-secondary" />
        ) : (
          <select
            value={value ?? ""}
            onChange={handleChange}
            className={inputClass}
          >
            {banLists.length === 0 ? (
              <>
                <option value="" disabled>
                  No ban lists yet
                </option>
                <option value="__create__">+ Create Ban List</option>
              </>
            ) : (
              <>
                <option value="">Select a ban list…</option>
                <option value="__create__">+ Create Ban List</option>
                {banLists.map((bl) => (
                  <option key={bl.id} value={bl.id}>
                    {bl.name}
                  </option>
                ))}
              </>
            )}
          </select>
        )}

        {value && (
          <div className="mt-2">
            {wordsLoading ? (
              <div className="h-6 rounded animate-pulse bg-bg-secondary" />
            ) : bannedWords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {bannedWords.map((word) => (
                  <span
                    key={word}
                    className="inline-block text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary"
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-secondary">
                No words in this ban list.
              </p>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <BanListModal
          onClose={() => setShowModal(false)}
          onCreated={(bl) => {
            setShowModal(false);
            fetchBanLists();
            onChange(bl.id);
          }}
        />
      )}
    </>
  );
}

// Resolve a $ref like "#/$defs/GuardrailOnFail" against the schema $defs
function resolveRef(
  ref: string,
  defs: ValidatorConfigSchema["$defs"],
): string[] {
  const key = ref.replace("#/$defs/", "");
  return defs?.[key]?.enum ?? [];
}

// Build the initial form values from a validator's config schema (using defaults)
export function buildDefaultValues(
  schema: ValidatorConfigSchema,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (key === "type") continue;
    if ("default" in prop) {
      values[key] = prop.default;
    }
  }
  return values;
}

interface FieldProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  defs: ValidatorConfigSchema["$defs"];
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

function SchemaField({ name, schema, defs, value, onChange }: FieldProps) {
  const label =
    schema.title ??
    name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const tooltip = FIELD_TOOLTIPS[name];

  const enumValues: string[] =
    schema.enum ??
    (schema.$ref ? resolveRef(schema.$ref, defs) : null) ??
    (schema.anyOf
      ? schema.anyOf.reduce(
          (acc: string[], item: { $ref?: string; enum?: string[] }) => {
            if (item.$ref) return [...acc, ...resolveRef(item.$ref, defs)];
            if (item.enum) return [...acc, ...item.enum];
            return acc;
          },
          [],
        )
      : null);

  const isArray =
    schema.type === "array" ||
    (schema.anyOf &&
      schema.anyOf.some((item: { type?: string }) => item.type === "array"));

  const labelEl = (
    <label className="block text-xs font-medium mb-1 text-text-primary">
      {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
  );

  const singleOptions = KNOWN_SINGLE_OPTIONS[name];
  if (singleOptions) {
    return (
      <div>
        {labelEl}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(name, e.target.value || null)}
          className={inputClass}
        >
          <option value="">Select…</option>
          {singleOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (enumValues && enumValues.length > 0 && !isArray) {
    return (
      <div>
        {labelEl}
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          className={inputClass}
        >
          {enumValues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isArray) {
    const knownOptions = KNOWN_ARRAY_OPTIONS[name];
    const selected = Array.isArray(value) ? (value as string[]) : [];

    if (knownOptions) {
      return (
        <div>
          {labelEl}
          <MultiSelect
            options={knownOptions}
            value={selected}
            onChange={(v) => onChange(name, v.length > 0 ? v : null)}
            placeholder={`Select ${label.toLowerCase()}…`}
          />
        </div>
      );
    }

    const displayValue = selected.join(", ");
    return (
      <Field
        label={label}
        value={displayValue}
        onChange={(v) => {
          const arr = v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(name, arr.length > 0 ? arr : null);
        }}
        placeholder="e.g. value1, value2"
      />
    );
  }

  return (
    <Field
      label={label}
      value={(value as string) ?? ""}
      onChange={(v) => onChange(name, v || null)}
    />
  );
}

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
      // Loading a saved config — populate everything
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
      // Cleared — reset everything
      setConfigName("");
      setStage("output");
      setOnFailAction("fix");
      setIsEnabled(true);
      setFieldValues({});
    }
  }, [selectedType, existingValues, existingName]);

  const typeDescription = selectedType
    ? (metaMap[selectedType]?.description ?? null)
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
    // Strip fields the backend never accepts at the top level
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
            {existingName
              ? `View / Edit: ${existingName}`
              : "New Validator Config"}
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
            <InfoTooltip text={FIELD_TOOLTIPS.stage} />
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
            <InfoTooltip text={FIELD_TOOLTIPS.on_fail_action} />
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
                  {metaMap[v.type]?.validator_name ??
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
