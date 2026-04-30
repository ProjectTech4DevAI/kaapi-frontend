"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import JsonEditor from "./JsonEditor";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  CloseIcon,
  TrashIcon,
} from "@/app/components/icons";
import { colors } from "@/app/lib/colors";
import { SchemaProperty, SchemaPropertyType } from "../types";
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
          className="flex-1 min-w-0 h-9 px-3 border rounded-md text-sm"
          style={{
            backgroundColor: colors.bg.primary,
            borderColor: colors.border,
            color: colors.text.primary,
          }}
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
            className="appearance-none w-full h-9 pl-3 pr-10 border rounded-md text-sm cursor-pointer"
            style={{
              backgroundColor: colors.bg.primary,
              borderColor: colors.border,
              color: colors.text.primary,
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            style={{ color: colors.text.secondary }}
          />
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
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors flex-shrink-0 cursor-pointer justify-self-center"
          style={{ color: colors.text.secondary }}
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
                className="h-8 px-3 border rounded-md text-sm max-w-[240px]"
                style={{
                  backgroundColor: colors.bg.primary,
                  borderColor: colors.border,
                  color: colors.text.primary,
                }}
              />
              <button
                onClick={() => onRemoveEnumValue(property.id, idx)}
                className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer"
                style={{ color: colors.text.secondary }}
                aria-label={`Remove enum value ${idx + 1} from ${property.name.trim() || "field"}`}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onAddEnumValue(property.id)}
            className="text-sm font-bold mt-0.5 cursor-pointer"
            style={{ color: colors.text.primary }}
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
            className="text-sm font-bold cursor-pointer"
            style={{ color: colors.text.primary }}
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
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />
      <div
        className="relative flex flex-col rounded-2xl shadow-2xl"
        style={{
          backgroundColor: colors.bg.primary,
          width: "720px",
          maxWidth: "90vw",
          maxHeight: "85vh",
        }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.text.primary }}
          >
            Response format
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
            style={{ color: colors.text.secondary }}
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <p className="px-6 text-sm" style={{ color: colors.text.secondary }}>
          Define the structure of the AI response. Use the visual editor or
          switch to JSON.
        </p>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <OutputSchemaEditorInner
            schema={draftSchema}
            setSchema={setDraftSchema}
          />
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <button
            onClick={handleReset}
            className="cursor-pointer rounded-lg border px-5 py-2 text-sm font-medium"
            style={{
              borderColor: colors.border,
              color: colors.text.primary,
              backgroundColor: colors.bg.primary,
            }}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium"
            style={{ backgroundColor: colors.accent.primary, color: "#fff" }}
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
      <div
        className="flex items-center gap-1 p-1 rounded-lg w-fit"
        style={{ backgroundColor: colors.bg.secondary }}
      >
        <button
          onClick={() => (editorMode === "code" ? switchToVisual() : undefined)}
          className="cursor-pointer px-4 py-1.5 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor:
              editorMode === "visual" ? colors.bg.primary : "transparent",
            color:
              editorMode === "visual"
                ? colors.text.primary
                : colors.text.secondary,
            boxShadow:
              editorMode === "visual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          Visual Editor
        </button>
        <button
          onClick={() => (editorMode !== "code" ? switchToCode() : undefined)}
          className="cursor-pointer px-4 py-1.5 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor:
              editorMode === "code" ? colors.bg.primary : "transparent",
            color:
              editorMode === "code"
                ? colors.text.primary
                : colors.text.secondary,
            boxShadow:
              editorMode === "code" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
        >
          JSON
        </button>
      </div>

      {editorMode === "visual" && (
        <div className="space-y-3">
          <div
            className="grid grid-cols-[minmax(0,1fr)_196px_56px_56px_36px] items-center gap-3 rounded-md px-1 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: colors.text.secondary }}
          >
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
            className="text-sm font-bold cursor-pointer px-4 py-2 rounded-lg"
            style={{ color: "#fff", backgroundColor: colors.accent.primary }}
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
          <h2
            className="text-lg font-semibold"
            style={{ color: colors.text.primary }}
          >
            {title}
          </h2>
          {description ? (
            <p
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              {description}
            </p>
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
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      <div className="flex-1 space-y-5 pb-16">
        <OutputSchemaEditor
          schema={schema}
          setSchema={setSchema}
          description="Leave this empty for free text, or add fields if you want a structured response."
        />
      </div>

      {/* Navigation */}
      <div
        className="mt-auto sticky bottom-0 z-10 flex items-center justify-between border-t py-2"
        style={{
          backgroundColor: colors.bg.secondary,
          borderColor: colors.border,
          marginLeft: "-1.5rem",
          marginRight: "-1.5rem",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
        }}
      >
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <button
            onClick={onBack}
            className="cursor-pointer rounded-lg border px-6 py-2.5 text-sm font-medium flex items-center gap-2"
            style={{
              borderColor: colors.border,
              color: colors.text.primary,
              backgroundColor: colors.bg.primary,
            }}
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            onClick={onNext}
            className="cursor-pointer rounded-lg px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: colors.accent.primary,
              color: "#fff",
              border: `1px solid ${colors.accent.primary}`,
            }}
          >
            Next: Review
          </button>
        </div>
      </div>
    </div>
  );
}
