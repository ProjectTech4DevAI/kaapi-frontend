import { EXAMPLE_RESPONSE_FORMAT_FIELDS } from "@/app/lib/assessment/placeholders";
import type {
  SchemaProperty,
  SchemaPropertyType,
} from "@/app/lib/types/assessment";

let idCounter = 0;
export function genId() {
  return `prop_${Date.now()}_${++idCounter}`;
}

export function createProperty(): SchemaProperty {
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

export function updateInTree(
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

export function removeFromTree(
  props: SchemaProperty[],
  id: string,
): SchemaProperty[] {
  return props
    .filter((p) => p.id !== id)
    .map((p) => ({ ...p, children: removeFromTree(p.children, id) }));
}

// The example response format (marks per question + reasoning + feedback)
// used both as the new-config default and the empty-state starter.
export function buildExampleResponseFormat(): SchemaProperty[] {
  return EXAMPLE_RESPONSE_FORMAT_FIELDS.map((field) => ({
    ...createProperty(),
    name: field.name,
    type: field.type,
  }));
}

// Insert a fresh property right after the row with `id` (wherever it nests)
// and return the new tree plus the created property (for focusing it).
export function insertAfterInTree(
  props: SchemaProperty[],
  id: string,
): { tree: SchemaProperty[]; created: SchemaProperty | null } {
  const index = props.findIndex((p) => p.id === id);
  if (index !== -1) {
    const created = createProperty();
    const tree = [
      ...props.slice(0, index + 1),
      created,
      ...props.slice(index + 1),
    ];
    return { tree, created };
  }
  let created: SchemaProperty | null = null;
  const tree = props.map((p) => {
    if (created || p.children.length === 0) return p;
    const result = insertAfterInTree(p.children, id);
    if (result.created) {
      created = result.created;
      return { ...p, children: result.tree };
    }
    return p;
  });
  return { tree, created };
}

export function addChildToTree(
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

export function toJsonSchema(properties: SchemaProperty[]): object | null {
  if (properties.length === 0) return null;
  const props: Record<string, object> = {};
  const required: string[] = [];
  properties.forEach((p) => {
    if (!p.name.trim()) return;
    let def: object;
    if (p.type === "object")
      def = toJsonSchema(p.children) || { type: "object" };
    else if (p.type === "enum")
      def = {
        type: "string",
        enum: p.enumValues.map(String).filter((v) => v.trim()),
      };
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

export function fromJsonSchema(
  schema: Record<string, unknown>,
): SchemaProperty[] {
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
      enumValues = (actualDef.enum as unknown[]).map(String);
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

// Blob-facing variant: a schema with no named fields means "no structured
// output" (json_output_schema omitted), not an empty object schema.
export function toJsonSchemaOrNull(
  properties: SchemaProperty[],
): object | null {
  const hasNamedField = properties.some((p) => p.name.trim());
  return hasNamedField ? toJsonSchema(properties) : null;
}

// Keep field names inside the safe subset every provider's structured-output
// mode accepts: letters, digits, underscore, hyphen (spaces become _).
export function sanitizeFieldName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");
}

// OpenAI strict mode requires every property to be required; the backend
// always submits with strict=true and does not repair optional fields, so the
// editor forces required on everything (recursively).
export function markAllRequired(props: SchemaProperty[]): SchemaProperty[] {
  return props.map((p) => ({
    ...p,
    isRequired: true,
    children: markAllRequired(p.children),
  }));
}

const UNSUPPORTED_SCHEMA_KEYWORDS = [
  "$ref",
  "$defs",
  "definitions",
  "anyOf",
  "oneOf",
  "allOf",
  "not",
] as const;

function findUnsupportedKeyword(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findUnsupportedKeyword(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object" || node === null) return null;
  const obj = node as Record<string, unknown>;
  for (const keyword of UNSUPPORTED_SCHEMA_KEYWORDS) {
    if (keyword in obj) return keyword;
  }
  for (const value of Object.values(obj)) {
    const found = findUnsupportedKeyword(value);
    if (found) return found;
  }
  return null;
}

function findOptionalProperty(node: Record<string, unknown>): string | null {
  if (node.type === "object" && node.properties) {
    const properties = node.properties as Record<string, unknown>;
    const required = Array.isArray(node.required)
      ? (node.required as string[])
      : [];
    for (const name of Object.keys(properties)) {
      if (!required.includes(name)) return name;
    }
    for (const child of Object.values(properties)) {
      if (typeof child === "object" && child !== null) {
        const found = findOptionalProperty(child as Record<string, unknown>);
        if (found) return found;
      }
    }
  }
  if (node.type === "array" && typeof node.items === "object" && node.items) {
    return findOptionalProperty(node.items as Record<string, unknown>);
  }
  return null;
}

// The strict subset the backend actually submits with (OpenAI strict:true ∩
// Gemini's OpenAPI flavor): object root, every property required, no
// $ref/anyOf/oneOf composition. The backend does no config-time validation of
// json_output_schema, so an invalid schema would only fail asynchronously
// inside the provider batch — enforce here instead.
export function validateStrictOutputSchema(raw: string): {
  valid: boolean;
  schema: Record<string, unknown> | null;
  error: string | null;
} {
  const base = validateOpenApiSchema(raw);
  if (!base.valid || !base.schema) return base;
  const unsupported = findUnsupportedKeyword(base.schema);
  if (unsupported) {
    return {
      valid: false,
      schema: null,
      error: `"${unsupported}" is not supported in structured output schemas.`,
    };
  }
  const optional = findOptionalProperty(base.schema);
  if (optional) {
    return {
      valid: false,
      schema: null,
      error: `Every field must be listed in "required" ("${optional}" is not) — structured output does not support optional fields.`,
    };
  }
  return base;
}

export function validateOpenApiSchema(raw: string): {
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
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return {
      valid: false,
      schema: null,
      error: "Schema must be a JSON object.",
    };
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== "object")
    return {
      valid: false,
      schema: null,
      error: 'Root schema must have "type": "object".',
    };
  if (!obj.properties || typeof obj.properties !== "object")
    return {
      valid: false,
      schema: null,
      error: 'Schema must have a "properties" object.',
    };
  return { valid: true, schema: obj, error: null };
}
