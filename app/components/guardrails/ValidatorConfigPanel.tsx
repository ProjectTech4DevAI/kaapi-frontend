import React, { useEffect, useState } from 'react';
import { colors } from '@/app/lib/colors';
import { Validator, ValidatorConfigSchema, formatValidatorName } from './types';
import BanListModal from './BanListModal';
import MultiSelect from '../MultiSelect';
import InfoTooltip from '@/app/components/InfoTooltip';
import validatorMeta from './validators.json';

interface ValidatorMeta {
  validator_type: string;
  validator_name: string;
  description: string;
}

const metaMap: Record<string, ValidatorMeta> = (validatorMeta as ValidatorMeta[]).reduce(
  (acc, v) => ({ ...acc, [v.validator_type]: v }),
  {},
);

// Known multi-select options keyed by field name
const KNOWN_ARRAY_OPTIONS: Record<string, string[]> = {
  entity_types: [
    'CREDIT_CARD', 'EMAIL_ADDRESS', 'IBAN_CODE', 'IP_ADDRESS', 'LOCATION',
    'MEDICAL_LICENSE', 'NRP', 'PERSON', 'PHONE_NUMBER', 'URL',
    'IN_AADHAAR', 'IN_PAN', 'IN_PASSPORT', 'IN_VEHICLE_REGISTRATION', 'IN_VOTER',
  ],
  languages: ['en', 'hi'],
  language: ['en', 'hi'],
};

// Single-select overrides for fields that are technically arrays but only one value makes sense
const KNOWN_SINGLE_OPTIONS: Record<string, string[]> = {
  categories: ['generic', 'healthcare', 'education', 'all'],
};

const FIELD_TOOLTIPS: Record<string, string> = {
  stage: 'Where this validator runs — "input" checks the user\'s message before it reaches the LLM, "output" checks the LLM\'s response before it is returned.',
  on_fail_action: '"fix" attempts to auto-remediate the violation, "exception" raises an error and blocks the response, "rephrase" asks the model to rewrite the output.',
};



interface BanList {
  id: string;
  name: string;
}

function BanListField({
  value,
  onChange,
  apiKey,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  apiKey: string;
}) {
  const [banLists, setBanLists] = useState<BanList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);

  const fetchBanLists = () => {
    setLoading(true);
    fetch('/api/guardrails/ban_lists', {
      headers: { 'X-API-KEY': apiKey },
    })
      .then((r) => r.json())
      .then((data) => {
        const list: BanList[] = Array.isArray(data?.data?.ban_lists)
          ? data.data.ban_lists
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.ban_lists)
          ? data.ban_lists
          : Array.isArray(data)
          ? data
          : [];
        setBanLists(list);
      })
      .catch(() => setBanLists([]))
      .finally(() => setLoading(false));
  };

  const fetchBannedWords = (id: string) => {
    setWordsLoading(true);
    setBannedWords([]);
    fetch(`/api/guardrails/ban_lists/${id}`, {
      headers: { 'X-API-KEY': apiKey },
    })
      .then((r) => r.json())
      .then((data) => {
        const words: string[] = Array.isArray(data?.banned_words)
          ? data.banned_words
          : Array.isArray(data?.data?.banned_words)
          ? data.data.banned_words
          : [];
        setBannedWords(words);
      })
      .catch(() => setBannedWords([]))
      .finally(() => setWordsLoading(false));
  };

  useEffect(() => { fetchBanLists(); }, []);

  useEffect(() => {
    if (value) {
      fetchBannedWords(value);
    } else {
      setBannedWords([]);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === '__create__') {
      setShowModal(true);
    } else {
      onChange(e.target.value || null);
    }
  };

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
          Ban List
        </label>
        {loading ? (
          <div className="h-8 rounded-md animate-pulse" style={{ backgroundColor: colors.bg.secondary }} />
        ) : (
          <select
            value={value ?? ''}
            onChange={handleChange}
            className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
          >
            {banLists.length === 0 ? (
              <>
                <option value="" disabled>No ban lists yet</option>
                <option value="__create__">+ Create Ban List</option>
              </>
            ) : (
              <>
                <option value="">Select a ban list…</option>
                <option value="__create__">+ Create Ban List</option>
                {banLists.map((bl) => (
                  <option key={bl.id} value={bl.id}>{bl.name}</option>
                ))}
              </>
            )}
          </select>
        )}

        {value && (
          <div className="mt-2">
            {wordsLoading ? (
              <div className="h-6 rounded animate-pulse" style={{ backgroundColor: colors.bg.secondary }} />
            ) : bannedWords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {bannedWords.map((word) => (
                  <span
                    key={word}
                    className="inline-block text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.bg.secondary, color: colors.text.secondary }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: colors.text.secondary }}>No words in this ban list.</p>
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
          apiKey={apiKey}
        />
      )}
    </>
  );
}

// Resolve a $ref like "#/$defs/GuardrailOnFail" against the schema $defs
function resolveRef(ref: string, defs: ValidatorConfigSchema['$defs']): string[] {
  const key = ref.replace('#/$defs/', '');
  return defs?.[key]?.enum ?? [];
}

// Build the initial form values from a validator's config schema (using defaults)
export function buildDefaultValues(
  schema: ValidatorConfigSchema,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (key === 'type') continue;
    if ('default' in prop) {
      values[key] = prop.default;
    }
  }
  return values;
}

interface FieldProps {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defs: ValidatorConfigSchema['$defs'];
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

function SchemaField({ name, schema, defs, value, onChange }: FieldProps) {
  const label = schema.title ?? name.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
  const tooltip = FIELD_TOOLTIPS[name];

  const enumValues: string[] =
    schema.enum ??
    (schema.$ref ? resolveRef(schema.$ref, defs) : null) ??
    (schema.anyOf
      ? schema.anyOf.reduce((acc: string[], item: { $ref?: string; enum?: string[] }) => {
          if (item.$ref) return [...acc, ...resolveRef(item.$ref, defs)];
          if (item.enum) return [...acc, ...item.enum];
          return acc;
        }, [])
      : null);

  const isArray =
    schema.type === 'array' ||
    (schema.anyOf &&
      schema.anyOf.some((item: { type?: string }) => item.type === 'array'));

  const labelEl = (
    <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
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
          value={(value as string) ?? ''}
          onChange={(e) => onChange(name, e.target.value || null)}
          className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
          style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
        >
          <option value="">Select…</option>
          {singleOptions.map((v) => (
            <option key={v} value={v}>{v}</option>
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
          value={(value as string) ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
          style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
        >
          {enumValues.map((v) => (
            <option key={v} value={v}>{v}</option>
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

    const displayValue = selected.join(', ');
    return (
      <div>
        {labelEl}
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            const arr = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
            onChange(name, arr.length > 0 ? arr : null);
          }}
          placeholder="e.g. value1, value2"
          className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
          style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
        />
      </div>
    );
  }

  return (
    <div>
      {labelEl}
      <input
        type="text"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(name, e.target.value || null)}
        className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
        style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
      />
    </div>
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
  apiKey: string;
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
  apiKey,
  onSave,
  onClear,
}: ValidatorConfigPanelProps) {
  const [configName, setConfigName] = useState('');
  const [stage, setStage] = useState<'input' | 'output'>('output');
  const [onFailAction, setOnFailAction] = useState('fix');
  const [isEnabled, setIsEnabled] = useState(true);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});

  const validator = selectedType ? (validators.find((v) => v.type === selectedType) ?? null) : null;

  useEffect(() => {
    if (existingValues != null) {
      // Loading a saved config — populate everything
      setConfigName(existingName ?? '');
      setStage((existingValues.stage as 'input' | 'output') ?? 'output');
      setOnFailAction((existingValues.on_fail_action as string) ?? 'fix');
      setIsEnabled((existingValues.is_enabled as boolean) ?? true);
      const { stage: _s, on_fail_action: _o, is_enabled: _i, ...rest } = existingValues;
      setFieldValues(validator ? (Object.keys(rest).length > 0 ? rest : buildDefaultValues(validator.config)) : {});
    } else if (validator) {
      // Type changed with no saved config — only reset dynamic fields, leave static fields alone
      setFieldValues(buildDefaultValues(validator.config));
    } else {
      // Cleared — reset everything
      setConfigName('');
      setStage('output');
      setOnFailAction('fix');
      setIsEnabled(true);
      setFieldValues({});
    }
  }, [selectedType, existingValues, existingName]);

  const typeDescription = selectedType ? (metaMap[selectedType]?.description ?? null) : null;
  const isBanList = selectedType === 'ban_list';

  const editableProperties = validator
    ? Object.entries(validator.config.properties).filter(([key]) => {
        if (key === 'type') return false;
        if (key === 'on_fail') return false;
        if (key === 'validator_metadata' || key === 'metadata') return false;
        if (isBanList && (key === 'banned_words' || key === 'ban_list_id')) return false;
        return true;
      })
    : [];

  const handleFieldChange = (name: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Strip fields the backend never accepts at the top level
    const EXCLUDED_KEYS = new Set(['on_fail', 'validator_metadata', 'metadata', 'type']);
    const cleanFieldValues = Object.fromEntries(
      Object.entries(fieldValues).filter(([k]) => !EXCLUDED_KEYS.has(k))
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
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: colors.bg.primary }}>
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3 shrink-0"
        style={{ borderColor: colors.border }}
      >
        <div>
          <div className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {existingName ? `View / Edit: ${existingName}` : 'New Validator Config'}
          </div>
          {!existingName && (
            <div className="text-xs" style={{ color: colors.text.secondary }}>
              Configure and save a validator
            </div>
          )}
        </div>
        {hasContent && !existingName && (
          <button
            onClick={onClear}
            className="text-xs px-2.5 py-1 rounded border transition-colors"
            style={{
              borderColor: colors.border,
              color: colors.text.secondary,
              backgroundColor: colors.bg.primary,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.bg.secondary)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = colors.bg.primary)}
          >
            Clear
          </button>
        )}
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Static fields — always visible ── */}

        {/* Config Name */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
            Config Name
          </label>
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="e.g. my-pii-remover-config"
            className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
          />
        </div>

        {/* Stage */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
            Stage
            <InfoTooltip text={FIELD_TOOLTIPS.stage} />
          </label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as 'input' | 'output')}
            className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
          >
            <option value="input">Input</option>
            <option value="output">Output</option>
          </select>
        </div>

        {/* On Fail Action */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
            On Fail Action
            <InfoTooltip text={FIELD_TOOLTIPS.on_fail_action} />
          </label>
          <select
            value={onFailAction}
            onChange={(e) => setOnFailAction(e.target.value)}
            className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
            style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
          >
            <option value="fix">Fix</option>
            <option value="exception">Exception</option>
            <option value="rephrase">Rephrase</option>
          </select>
        </div>

        {/* Enabled */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm" style={{ color: colors.text.primary }}>Enabled</span>
        </label>

        {/* ── Validator Type — divider then type selector ── */}
        <div className="border-t pt-3" style={{ borderColor: colors.border }}>
          <label className="block text-xs font-medium mb-1" style={{ color: colors.text.primary }}>
            Validator Type
          </label>
          {validatorsLoading ? (
            <div className="h-8 rounded-md animate-pulse" style={{ backgroundColor: colors.bg.secondary }} />
          ) : (
            <select
              value={selectedType ?? ''}
              onChange={(e) => onTypeChange(e.target.value || null)}
              className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
              style={{ borderColor: colors.border, backgroundColor: colors.bg.primary, color: colors.text.primary }}
            >
              <option value="">Select a validator type…</option>
              {validators.map((v) => (
                <option key={v.type} value={v.type}>
                  {metaMap[v.type]?.validator_name ?? formatValidatorName(v.type)}
                </option>
              ))}
            </select>
          )}
          {typeDescription && (
            <p className="text-xs mt-1.5" style={{ color: colors.text.secondary }}>
              {typeDescription}
            </p>
          )}
        </div>

        {/* ── Dynamic fields — only when a type is selected ── */}
        {validator && (
          <>
            {/* Ban list */}
            {isBanList && (
              <div className="border-t pt-3" style={{ borderColor: colors.border }}>
                <BanListField
                  value={(fieldValues['ban_list_id'] as string | null) ?? null}
                  onChange={(id) => handleFieldChange('ban_list_id', id)}
                  apiKey={apiKey}
                />
              </div>
            )}

            {/* Dynamic schema fields */}
            {editableProperties.length > 0 && (
              <div className="border-t pt-3" style={{ borderColor: colors.border }}>
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

      {/* Save button — always visible once there's a name and type */}
      <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: colors.border }}>
        <button
          onClick={handleSave}
          disabled={isSaving || !configName.trim() || !selectedType}
          className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: colors.accent.primary, color: '#ffffff' }}
        >
          {isSaving ? 'Saving…' : 'Save Config'}
        </button>
      </div>
    </div>
  );
}
