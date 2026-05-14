import { ValidatorConfigSchema } from "@/app/lib/types/guardrails";
import InfoTooltip from "@/app/components/InfoTooltip";
import MultiSelect from "../MultiSelect";
import Field from "@/app/components/Field";
import Select from "@/app/components/Select";
import { resolveRef } from "@/app/lib/utils/guardrails";
import {
  GUARDRAILS_FIELD_TOOLTIPS,
  KNOWN_ARRAY_OPTIONS,
  KNOWN_SINGLE_OPTIONS,
  VALIDATOR_FIELD_OPTIONS,
} from "@/app/lib/data/guardrails/validators";

type SchemaProp = ValidatorConfigSchema["properties"][string];
type AnyOfMember = { $ref?: string; enum?: string[]; type?: string };

interface SchemaFieldProps {
  name: string;
  schema: SchemaProp;
  defs: ValidatorConfigSchema["$defs"];
  value: unknown;
  onChange: (name: string, value: unknown) => void;
  validatorType?: string;
}

export default function SchemaField({
  name,
  schema,
  defs,
  value,
  onChange,
  validatorType,
}: SchemaFieldProps) {
  const label =
    schema.title ??
    name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
  const tooltip = GUARDRAILS_FIELD_TOOLTIPS[name];

  const anyOf = schema.anyOf as AnyOfMember[] | undefined;

  const enumValues: string[] =
    schema.enum ??
    (schema.$ref ? resolveRef(schema.$ref, defs) : null) ??
    (anyOf
      ? anyOf.reduce<string[]>((acc, item) => {
          if (item.$ref) return [...acc, ...resolveRef(item.$ref, defs)];
          if (item.enum) return [...acc, ...item.enum];
          return acc;
        }, [])
      : null);

  const isArray =
    schema.type === "array" ||
    (anyOf?.some((item) => item.type === "array") ?? false);

  const labelEl = (
    <label className="block text-xs font-medium mb-1 text-text-primary">
      {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </label>
  );

  const singleOptions =
    (validatorType && VALIDATOR_FIELD_OPTIONS[validatorType]?.[name]) ||
    KNOWN_SINGLE_OPTIONS[name];
  if (singleOptions) {
    return (
      <div>
        {labelEl}
        <Select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(name, e.target.value || null)}
          placeholder="Select…"
          options={singleOptions.map((v) => ({ value: v, label: v }))}
        />
      </div>
    );
  }

  if (enumValues && enumValues.length > 0 && !isArray) {
    return (
      <div>
        {labelEl}
        <Select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(name, e.target.value)}
          options={enumValues.map((v) => ({ value: v, label: v }))}
        />
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
