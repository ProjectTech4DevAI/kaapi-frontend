// Utility functions for building and serializing the assessment output schema.
// Converts the UI SchemaProperty tree into a JSON Schema object sent to the backend with the run payload.
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
