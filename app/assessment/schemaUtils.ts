import { SchemaProperty } from './types';

/**
 * Convert SchemaProperty[] tree to a JSON Schema object.
 * Returns null if no valid properties exist.
 */
export function schemaToJsonSchema(properties: SchemaProperty[]): object | null {
  if (properties.length === 0) return null;

  const props: Record<string, object> = {};
  const required: string[] = [];

  properties.forEach(p => {
    if (!p.name.trim()) return;

    let def: object;
    if (p.type === 'object') {
      def = schemaToJsonSchema(p.children) || { type: 'object' };
    } else if (p.type === 'enum') {
      def = { type: 'string', enum: p.enumValues.filter(v => v.trim()) };
    } else {
      def = { type: p.type };
    }

    if (p.isArray) {
      def = { type: 'array', items: def };
    }

    props[p.name] = def;
    if (p.isRequired) required.push(p.name);
  });

  if (Object.keys(props).length === 0) return null;

  return {
    type: 'object',
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  };
}
