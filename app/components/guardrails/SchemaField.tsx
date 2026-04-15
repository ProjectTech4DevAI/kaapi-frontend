import { ValidatorConfigSchema } from "@/app/lib/types/guardrails";
import InfoTooltip from "@/app/components/InfoTooltip";
import MultiSelect from "../MultiSelect";
import Field from "@/app/components/Field";
import { resolveRef } from "@/app/lib/utils/guardrails";
import { GUARDRAILS_FIELD_TOOLTIPS } from "@/app/lib/data/guardrails/validators";

const inputClass =
  "w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-1";

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

const KNOWN_SINGLE_OPTIONS: Record<string, string[]> = {
  categories: ["generic", "healthcare", "education", "all"],
};

type SchemaProp = ValidatorConfigSchema["properties"][string];
type AnyOfMember = { $ref?: string; enum?: string[]; type?: string };

interface SchemaFieldProps {
  name: string;
  schema: SchemaProp;
  defs: ValidatorConfigSchema["$defs"];
  value: unknown;
  onChange: (name: string, value: unknown) => void;
}

export default function SchemaField({
  name,
  schema,
  defs,
  value,
  onChange,
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
