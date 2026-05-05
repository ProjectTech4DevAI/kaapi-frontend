"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/app/components";
import type { SchemaProperty } from "@/app/lib/types/assessment";
import JsonEditor from "../JsonEditor";
import {
  addChildToTree,
  createProperty,
  fromJsonSchema,
  removeFromTree,
  toJsonSchema,
  updateInTree,
  validateOpenApiSchema,
} from "@/app/lib/utils/outputSchema";
import SchemaPropertyRow from "./SchemaPropertyRow";

interface OutputSchemaEditorInnerProps {
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
}

export default function OutputSchemaEditorInner({
  schema,
  setSchema,
}: OutputSchemaEditorInnerProps) {
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
            <SchemaPropertyRow
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
