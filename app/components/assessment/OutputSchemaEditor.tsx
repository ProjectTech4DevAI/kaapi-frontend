"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import JsonEditor from "./JsonEditor";
import { Button, Modal } from "@/app/components";
import Select from "@/app/components/Select";
import { CloseIcon, TrashIcon } from "@/app/components/icons";
import { SCHEMA_TYPE_OPTIONS } from "@/app/lib/assessment/constants";
import type {
  SchemaProperty,
  SchemaPropertyType,
  ValueSetter,
} from "@/app/lib/types/assessment";

interface OutputSchemaEditorProps {
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
  title?: string;
  description?: ReactNode;
}

interface PropertyRowProps {
  property: SchemaProperty;
  depth: number;
  onUpdate: (
    id: string,
    updater: (property: SchemaProperty) => SchemaProperty,
  ) => void;
  onRemove: ValueSetter<string>;
  onAddChild: ValueSetter<string>;
  onAddEnumValue: ValueSetter<string>;
  onUpdateEnumValue: (id: string, index: number, value: string) => void;
  onRemoveEnumValue: (id: string, index: number) => void;
}

interface OutputSchemaModalProps {
  open: boolean;
  onClose: () => void;
  schema: SchemaProperty[];
  setSchema: ValueSetter<SchemaProperty[]>;
}
import CompactToggleSwitch from "./CompactToggleSwitch";
import {
  addChildToTree,
  createProperty,
  fromJsonSchema,
  removeFromTree,
  toJsonSchema,
  updateInTree,
  validateOpenApiSchema,
} from "./outputSchemaUtils";

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
          className="h-9 min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary"
        />
        <div className="min-w-0">
          <Select
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
            options={SCHEMA_TYPE_OPTIONS}
            className="h-9 w-full cursor-pointer rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-sm text-text-primary outline-none focus:ring-1"
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
          type="button"
          onClick={() => onRemove(property.id)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center justify-self-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
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
                className="h-8 max-w-[240px] rounded-md border border-border bg-bg-primary px-3 text-sm text-text-primary"
              />
              <button
                type="button"
                onClick={() => onRemoveEnumValue(property.id, idx)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
                aria-label={`Remove enum value ${idx + 1} from ${property.name.trim() || "field"}`}
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddEnumValue(property.id)}
            className="mt-0.5 !justify-start !px-0 text-text-primary"
          >
            + Add enum value
          </Button>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAddChild(property.id)}
            className="!justify-start !px-0 text-text-primary"
          >
            + Add nested property
          </Button>
        </div>
      )}
    </div>
  );
}

export function OutputSchemaModal({
  open,
  onClose,
  schema,
  setSchema,
}: OutputSchemaModalProps) {
  const [draftSchema, setDraftSchema] = useState<SchemaProperty[]>([]);
  const [mounted, setMounted] = useState(false);
  const schemaRef = useRef(schema);

  useEffect(() => {
    setMounted(true);
  }, []);
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

  if (!open || !mounted) return null;

  const handleSave = () => {
    setSchema(draftSchema);
    onClose();
  };
  const handleReset = () => {
    setDraftSchema([createProperty()]);
  };

  return createPortal(
    <Modal
      open
      onClose={onClose}
      maxWidth="w-[720px] max-w-[90vw]"
      maxHeight="max-h-[85vh]"
      showClose={false}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h2 className="text-lg font-semibold text-text-primary">
          Response format
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          aria-label="Close response format"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <p className="px-6 text-sm text-text-secondary">
        Define the structure of the AI response. Use the visual editor or switch
        to JSON.
      </p>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <OutputSchemaEditorInner
          schema={draftSchema}
          setSchema={setDraftSchema}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={handleReset}>
          Reset
        </Button>
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Modal>,
    document.body,
  );
}

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
      const next = removeFromTree(schema, id);
      setSchema(next.length > 0 ? next : [createProperty()]);
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
    if (editorMode !== "visual") return;
    if (schema.length > 0) {
      hasInitializedDefaultFieldRef.current = true;
      hasUserClearedFromJsonRef.current = false;
      return;
    }
    if (hasUserClearedFromJsonRef.current) return;
    if (!hasInitializedDefaultFieldRef.current || schema.length === 0) {
      hasInitializedDefaultFieldRef.current = true;
      setSchema([createProperty()]);
    }
  }, [editorMode, schema.length, setSchema]);

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
      <div className="flex w-fit items-center gap-1 rounded-lg bg-bg-secondary p-1">
        <Button
          type="button"
          variant={editorMode === "visual" ? "outline" : "ghost"}
          size="sm"
          onClick={() => (editorMode === "code" ? switchToVisual() : undefined)}
          className={`!rounded-md !px-4 !py-1.5 ${
            editorMode === "visual"
              ? "!bg-bg-primary text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "!bg-transparent text-text-secondary"
          }`}
        >
          Visual Editor
        </Button>
        <Button
          type="button"
          variant={editorMode === "code" ? "outline" : "ghost"}
          size="sm"
          onClick={() => (editorMode !== "code" ? switchToCode() : undefined)}
          className={`!rounded-md !px-4 !py-1.5 ${
            editorMode === "code"
              ? "!bg-bg-primary text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
              : "!bg-transparent text-text-secondary"
          }`}
        >
          JSON
        </Button>
      </div>

      {editorMode === "visual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_196px_56px_56px_36px] items-center gap-3 rounded-md px-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
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
          <Button
            type="button"
            onClick={() => setSchema([...schema, createProperty()])}
            className="!rounded-lg !font-bold"
          >
            + Add field
          </Button>
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
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-text-secondary">{description}</p>
          ) : null}
        </div>
      )}
      <OutputSchemaEditorInner schema={schema} setSchema={setSchema} />
    </div>
  );
}
