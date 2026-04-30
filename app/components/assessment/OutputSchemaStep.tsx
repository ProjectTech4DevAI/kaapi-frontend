"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JsonEditor from "./JsonEditor";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  TrashIcon,
} from "@/app/components/icons";
import {
  type SchemaProperty,
  type SchemaPropertyType,
} from "@/app/assessment/types";
import CompactToggleSwitch from "./CompactToggleSwitch";

interface OutputSchemaStepProps {
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface OutputSchemaEditorProps {
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
  title?: string;
  description?: React.ReactNode;
}

const TYPE_OPTIONS: Array<{ value: SchemaPropertyType; label: string }> = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Whole number" },
  { value: "boolean", label: "Yes / No" },
  { value: "enum", label: "Choice" },
  { value: "object", label: "Group" },
];

let idCounter = 0;
function genId() {
  return `prop_${Date.now()}_${++idCounter}`;
}

function createProperty(): SchemaProperty {
  return {
    id: genId(),
    name: "",
    type: "string",
    isArray: false,
    isRequired: true,
    children: [],
    enumValues: [],
  };
}

function updateInTree(
  props: SchemaProperty[],
  id: string,
  updater: (p: SchemaProperty) => SchemaProperty,
): SchemaProperty[] {
  return props.map((p) => {
    if (p.id === id) return updater(p);
    if (p.children.length > 0)
      return { ...p, children: updateInTree(p.children, id, updater) };
    return p;
  });
}

function removeFromTree(props: SchemaProperty[], id: string): SchemaProperty[] {
  return props
    .filter((p) => p.id !== id)
    .map((p) => ({ ...p, children: removeFromTree(p.children, id) }));
}

function addChildToTree(
  props: SchemaProperty[],
  parentId: string,
): SchemaProperty[] {
  return props.map((p) => {
    if (p.id === parentId)
      return { ...p, children: [...p.children, createProperty()] };
    if (p.children.length > 0)
      return { ...p, children: addChildToTree(p.children, parentId) };
    return p;
  });
}

/* ── JSON Schema ↔ SchemaProperty[] conversion ── */
function toJsonSchema(properties: SchemaProperty[]): object | null {
  if (properties.length === 0) return null;
  const props: Record<string, object> = {};
  const required: string[] = [];
  properties.forEach((p) => {
    if (!p.name.trim()) return;
    let def: object;
    if (p.type === "object")
      def = toJsonSchema(p.children) || { type: "object" };
    else if (p.type === "enum")
      def = { type: "string", enum: p.enumValues.filter((v) => v.trim()) };
    else def = { type: p.type };
    if (p.isArray) def = { type: "array", items: def };
    props[p.name] = def;
    if (p.isRequired) required.push(p.name);
  });
  return {
    type: "object",
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  };
}

function fromJsonSchema(schema: Record<string, unknown>): SchemaProperty[] {
  if (!schema || schema.type !== "object" || !schema.properties) return [];
  const required: string[] = Array.isArray(schema.required)
    ? (schema.required as string[])
    : [];
  const properties = schema.properties as Record<
    string,
    Record<string, unknown>
  >;
  return Object.entries(properties).map(([name, def]) => {
    let type: SchemaPropertyType = "string";
    let isArray = false;
    let children: SchemaProperty[] = [];
    let enumValues: string[] = [];
    let actualDef: Record<string, unknown> = def;
    if (def.type === "array" && def.items && typeof def.items === "object") {
      isArray = true;
      actualDef = def.items as Record<string, unknown>;
    }
    if (actualDef.type === "object") {
      type = "object";
      children = fromJsonSchema(actualDef as Record<string, unknown>);
    } else if (Array.isArray(actualDef.enum)) {
      type = "enum";
      enumValues = actualDef.enum as string[];
    } else {
      type = (actualDef.type as SchemaPropertyType) || "string";
    }
    return {
      id: genId(),
      name,
      type,
      isArray,
      isRequired: required.includes(name),
      children,
      enumValues,
    };
  });
}

function validateOpenApiSchema(raw: string): {
  valid: boolean;
  schema: Record<string, unknown> | null;
  error: string | null;
} {
  if (!raw.trim()) return { valid: true, schema: null, error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      valid: false,
      schema: null,
      error: "Invalid JSON — check for syntax errors.",
    };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {
      valid: false,
      schema: null,
      error: "Schema must be a JSON object.",
    };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== "object") {
    return {
      valid: false,
      schema: null,
      error: 'Root schema must have "type": "object".',
    };
  }
  if (!obj.properties || typeof obj.properties !== "object") {
    return {
      valid: false,
      schema: null,
      error: 'Schema must have a "properties" object.',
    };
  }
  return { valid: true, schema: obj, error: null };
}

/* ── PropertyRow ── */
interface PropertyRowProps {
  property: SchemaProperty;
  depth: number;
  onUpdate: (
    id: string,
    updater: (p: SchemaProperty) => SchemaProperty,
  ) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onAddEnumValue: (id: string) => void;
  onUpdateEnumValue: (id: string, index: number, value: string) => void;
  onRemoveEnumValue: (id: string, index: number) => void;
}

function PropertyRow({
  property,
  depth,
  onUpdate,
  onRemove,
  onAddChild,
  onAddEnumValue,
  onUpdateEnumValue,
  onRemoveEnumValue,
}: PropertyRowProps) {
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_196px_56px_56px_36px] items-center gap-3">
        <input
          type="text"
          value={property.name}
          onChange={(e) =>
            onUpdate(property.id, (p) => ({ ...p, name: e.target.value }))
          }
          placeholder="name"
          className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
        />
        <div className="relative min-w-0">
          <select
            value={property.type}
            onChange={(e) => {
              const t = e.target.value as SchemaPropertyType;
              onUpdate(property.id, (p) => ({
                ...p,
                type: t,
                children: t === "object" ? p.children : [],
                enumValues:
                  t === "enum"
                    ? p.enumValues.length > 0
                      ? p.enumValues
                      : [""]
                    : [],
              }));
            }}
            className="h-9 w-full cursor-pointer appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-10 text-sm text-neutral-900"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
        </div>
        <CompactToggleSwitch
          checked={property.isArray}
          onChange={() =>
            onUpdate(property.id, (p) => ({ ...p, isArray: !p.isArray }))
          }
          title={property.isArray ? "Remove array wrapper" : "Make array"}
        />
        <CompactToggleSwitch
          checked={property.isRequired}
          onChange={() =>
            onUpdate(property.id, (p) => ({ ...p, isRequired: !p.isRequired }))
          }
          title={property.isRequired ? "Mark optional" : "Mark required"}
        />
        <button
          onClick={() => onRemove(property.id)}
          className="flex h-8 w-8 cursor-pointer justify-self-center items-center justify-center rounded-md text-neutral-500 transition-colors"
          aria-label={`Delete ${property.name.trim() || "field"}`}
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {property.type === "enum" && (
        <div className="ml-3 mt-2 space-y-1.5">
          {property.enumValues.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={val}
                onChange={(e) =>
                  onUpdateEnumValue(property.id, idx, e.target.value)
                }
                placeholder={`value ${idx + 1}`}
                className="h-8 max-w-[240px] rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900"
              />
              <button
                onClick={() => onRemoveEnumValue(property.id, idx)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500"
                aria-label={`Remove enum value ${idx + 1} from ${property.name.trim() || "field"}`}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddEnumValue(property.id)}
            className="mt-0.5 cursor-pointer text-sm font-bold text-neutral-900"
          >
            + Add enum value
          </button>
        </div>
      )}

      {property.type === "object" && (
        <div className="mt-2 ml-6 space-y-3">
          {property.children.map((child) => (
            <PropertyRow
              key={child.id}
              property={child}
              depth={depth + 1}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onAddChild={onAddChild}
              onAddEnumValue={onAddEnumValue}
              onUpdateEnumValue={onUpdateEnumValue}
              onRemoveEnumValue={onRemoveEnumValue}
            />
          ))}
          <button
            onClick={() => onAddChild(property.id)}
            className="cursor-pointer text-sm font-bold text-neutral-900"
          >
            + Add nested property
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Modal wrapper ── */
interface OutputSchemaModalProps {
  open: boolean;
  onClose: () => void;
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
}

export function OutputSchemaModal({
  open,
  onClose,
  schema,
  setSchema,
}: OutputSchemaModalProps) {
  const [draftSchema, setDraftSchema] = useState<SchemaProperty[]>([]);
  const schemaRef = useRef(schema);

  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  useEffect(() => {
    if (open) {
      setDraftSchema(
        JSON.parse(JSON.stringify(schemaRef.current)) as SchemaProperty[],
      );
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    setSchema(draftSchema);
    onClose();
  };

  const handleReset = () => {
    setDraftSchema([createProperty()]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-[720px] max-w-[90vw] flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-neutral-900">
            Response format
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-500"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="px-6 text-sm text-neutral-500">
          Define the structure of the AI response. Use the visual editor or
          switch to JSON.
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <OutputSchemaEditorInner
            schema={draftSchema}
            setSchema={setDraftSchema}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            onClick={handleReset}
            className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-5 py-2 text-sm font-medium text-neutral-900"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="cursor-pointer rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inner editor (used by both modal and standalone) ── */
function OutputSchemaEditorInner({
  schema,
  setSchema,
}: {
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
}) {
  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");
  const [codeValue, setCodeValue] = useState(() => {
    const json = toJsonSchema(schema);
    return json ? JSON.stringify(json, null, 2) : "";
  });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeIsValid, setCodeIsValid] = useState(false);
  const hasInitializedDefaultFieldRef = useRef(false);
  const hasUserClearedFromJsonRef = useRef(false);

  const handleUpdate = useCallback(
    (id: string, updater: (p: SchemaProperty) => SchemaProperty) => {
      setSchema(updateInTree(schema, id, updater));
    },
    [schema, setSchema],
  );

  const handleRemove = useCallback(
    (id: string) => {
      const nextSchema = removeFromTree(schema, id);
      setSchema(nextSchema.length > 0 ? nextSchema : [createProperty()]);
    },
    [schema, setSchema],
  );
  const handleAddChild = useCallback(
    (parentId: string) => {
      setSchema(addChildToTree(schema, parentId));
    },
    [schema, setSchema],
  );
  const handleAddEnumValue = useCallback(
    (id: string) => {
      setSchema(
        updateInTree(schema, id, (p) => ({
          ...p,
          enumValues: [...p.enumValues, ""],
        })),
      );
    },
    [schema, setSchema],
  );
  const handleUpdateEnumValue = useCallback(
    (id: string, index: number, value: string) => {
      setSchema(
        updateInTree(schema, id, (p) => ({
          ...p,
          enumValues: p.enumValues.map((v, i) => (i === index ? value : v)),
        })),
      );
    },
    [schema, setSchema],
  );
  const handleRemoveEnumValue = useCallback(
    (id: string, index: number) => {
      setSchema(
        updateInTree(schema, id, (p) => ({
          ...p,
          enumValues: p.enumValues.filter((_, i) => i !== index),
        })),
      );
    },
    [schema, setSchema],
  );

  useEffect(() => {
    if (editorMode !== "visual") {
      return;
    }

    if (schema.length > 0) {
      hasInitializedDefaultFieldRef.current = true;
      hasUserClearedFromJsonRef.current = false;
      return;
    }

    if (hasUserClearedFromJsonRef.current) {
      return;
    }

    if (!hasInitializedDefaultFieldRef.current || schema.length === 0) {
      hasInitializedDefaultFieldRef.current = true;
      setSchema([createProperty()]);
    }
  }, [editorMode, schema.length, setSchema]);

  /* Real-time validation + debounced auto-apply */
  useEffect(() => {
    if (editorMode !== "code") return;
    const timer = setTimeout(() => {
      if (!codeValue.trim()) {
        setCodeError(null);
        setCodeIsValid(false);
        setSchema([]);
        return;
      }
      const result = validateOpenApiSchema(codeValue);
      if (result.valid) {
        setCodeError(null);
        setCodeIsValid(true);
        if (result.schema) setSchema(fromJsonSchema(result.schema));
        else setSchema([]);
      } else {
        setCodeError(result.error);
        setCodeIsValid(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [codeValue, editorMode, setSchema]);

  const switchToVisual = () => {
    const result = validateOpenApiSchema(codeValue);
    if (!result.valid) {
      setCodeError(result.error);
      return;
    }
    if (result.schema) {
      hasUserClearedFromJsonRef.current = false;
      setSchema(fromJsonSchema(result.schema));
    } else {
      hasUserClearedFromJsonRef.current = true;
      setSchema([]);
    }
    setCodeError(null);
    setEditorMode("visual");
  };

  const switchToCode = () => {
    const json = toJsonSchema(schema);
    setCodeValue(json ? JSON.stringify(json, null, 2) : "");
    setCodeError(null);
    setCodeIsValid(false);
    setEditorMode("code");
  };

  return (
    <div className="space-y-5">
      <div className="flex w-fit items-center gap-1 rounded-lg bg-neutral-50 p-1">
        <button
          onClick={() => (editorMode === "code" ? switchToVisual() : undefined)}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            editorMode === "visual"
              ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "bg-transparent text-neutral-500"
          }`}
        >
          Visual Editor
        </button>
        <button
          onClick={() => (editorMode !== "code" ? switchToCode() : undefined)}
          className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
            editorMode === "code"
              ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "bg-transparent text-neutral-500"
          }`}
        >
          JSON
        </button>
      </div>

      {editorMode === "visual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_196px_56px_56px_36px] items-center gap-3 rounded-md px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            <span>Output Field</span>
            <span>Type</span>
            <span>Array</span>
            <span>Required</span>
            <span />
          </div>
          {schema.map((prop) => (
            <PropertyRow
              key={prop.id}
              property={prop}
              depth={0}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onAddChild={handleAddChild}
              onAddEnumValue={handleAddEnumValue}
              onUpdateEnumValue={handleUpdateEnumValue}
              onRemoveEnumValue={handleRemoveEnumValue}
            />
          ))}
          <button
            onClick={() => setSchema([...schema, createProperty()])}
            className="cursor-pointer rounded-lg bg-neutral-900 px-4 py-2 text-sm font-bold text-white"
          >
            + Add field
          </button>
        </div>
      )}

      {editorMode === "code" && (
        <JsonEditor
          value={codeValue}
          onChange={setCodeValue}
          error={codeError}
          isValid={codeIsValid}
          minHeight={420}
          placeholder={`{\n  "type": "object",\n  "properties": {\n    "score": { "type": "number" },\n    "reason": { "type": "string" }\n  },\n  "required": ["score", "reason"]\n}`}
        />
      )}
    </div>
  );
}

/* ── Public standalone editor (kept for backward compat) ── */
export function OutputSchemaEditor({
  schema,
  setSchema,
  title = "Response Format",
  description,
}: OutputSchemaEditorProps) {
  return (
    <div className="space-y-5">
      {title && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
          ) : null}
        </div>
      )}
      <OutputSchemaEditorInner schema={schema} setSchema={setSchema} />
    </div>
  );
}

export default function OutputSchemaStep({
  schema,
  setSchema,
  onNext,
  onBack,
}: OutputSchemaStepProps) {
  return (
    <div className="mx-auto flex h-full min-h-0 max-w-2xl flex-col">
      <div className="flex-1 space-y-5 pb-16">
        <OutputSchemaEditor
          schema={schema}
          setSchema={setSchema}
          description="Leave this empty for free text, or add fields if you want a structured response."
        />
      </div>

      {/* Navigation */}
      <div className="mt-auto sticky bottom-0 z-10 -mx-6 flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-6 py-2">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-white px-6 py-2.5 text-sm font-medium text-neutral-900"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            onClick={onNext}
            className="cursor-pointer rounded-lg border border-neutral-900 bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white"
          >
            Next: Review
          </button>
        </div>
      </div>
    </div>
  );
}
