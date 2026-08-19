"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, RadioGroup } from "@/app/components/ui";
import type { SchemaProperty } from "@/app/lib/types/assessment";
import JsonEditor from "../JsonEditor";
import {
  addChildToTree,
  createProperty,
  fromJsonSchema,
  insertAfterInTree,
  markAllRequired,
  removeFromTree,
  toJsonSchema,
  updateInTree,
  validateStrictOutputSchema,
} from "@/app/lib/utils/outputSchema";
import SchemaPropertyRow, { SCHEMA_ROW_GRID } from "./SchemaPropertyRow";

interface OutputSchemaEditorInnerProps {
  schema: SchemaProperty[];
  setSchema: (schema: SchemaProperty[]) => void;
}

// Visual/JSON editor for the response format. Every field is required —
// provider strict structured-output mode rejects optional properties and the
// backend does not repair schemas — so imports are normalized with
// markAllRequired and the JSON view validates the same strict subset.
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
  const [focusId, setFocusId] = useState<string | null>(null);
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

  // Quick-add: Enter in a name input appends the next field and focuses it.
  const handleEnterInName = useCallback(
    (id: string) => {
      const { tree, created } = insertAfterInTree(schema, id);
      if (!created) return;
      setSchema(tree);
      setFocusId(created.id);
    },
    [schema, setSchema],
  );

  const handleAddField = useCallback(() => {
    const created = createProperty();
    setSchema([...schema, created]);
    setFocusId(created.id);
  }, [schema, setSchema]);

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
      const result = validateStrictOutputSchema(codeValue);
      if (result.valid) {
        setCodeError(null);
        setCodeIsValid(true);
        if (result.schema)
          setSchema(markAllRequired(fromJsonSchema(result.schema)));
        else setSchema([]);
      } else {
        setCodeError(result.error);
        setCodeIsValid(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [codeValue, editorMode, setSchema]);

  const switchToVisual = () => {
    const result = validateStrictOutputSchema(codeValue);
    if (!result.valid) {
      setCodeError(result.error);
      return;
    }
    if (result.schema) {
      hasUserClearedFromJsonRef.current = false;
      setSchema(markAllRequired(fromJsonSchema(result.schema)));
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
    <div className="space-y-4">
      <RadioGroup<"visual" | "code">
        value={editorMode}
        onChange={(v) => (v === "visual" ? switchToVisual() : switchToCode())}
        ariaLabel="Schema editor mode"
        options={[
          { value: "visual", label: "Visual Editor" },
          { value: "code", label: "JSON" },
        ]}
      />

      {editorMode === "visual" && (
        <div className="space-y-3">
          <div
            className={`${SCHEMA_ROW_GRID} rounded-md px-1 text-[11px] font-semibold uppercase tracking-wide text-text-secondary`}
          >
            <span>Output field</span>
            <span>Type</span>
            <span>List</span>
            <span />
          </div>
          {schema.map((prop) => (
            <SchemaPropertyRow
              key={prop.id}
              property={prop}
              depth={0}
              focusId={focusId}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              onAddChild={handleAddChild}
              onAddEnumValue={handleAddEnumValue}
              onUpdateEnumValue={handleUpdateEnumValue}
              onRemoveEnumValue={handleRemoveEnumValue}
              onEnterInName={handleEnterInName}
            />
          ))}
          <Button type="button" variant="outline" onClick={handleAddField}>
            + Add field
          </Button>
          <p className="text-[11px] text-text-secondary">
            Tip: press Enter in a field name to add the next one. Every field is
            always filled in by the AI.
          </p>
        </div>
      )}

      {editorMode === "code" && (
        <JsonEditor
          value={codeValue}
          onChange={setCodeValue}
          error={codeError}
          isValid={codeIsValid}
          minHeight={420}
          placeholder={`{\n  "type": "object",\n  "properties": {\n    "q1_marks": { "type": "integer" },\n    "overall_feedback": { "type": "string" }\n  },\n  "required": ["q1_marks", "overall_feedback"]\n}`}
        />
      )}
    </div>
  );
}
