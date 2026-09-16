/**
 * Prompt tokens: the one place that knows `@Column` (text), `<Column>` (attachment)
 * and the legacy `{Column}` form, how they highlight, how they resolve against a
 * sample row, and how they convert to and from the wire payload. No React.
 */
import type {
  Attachment,
  PromptFieldType,
  PromptSegment,
  PreviewBlock,
  PreviewBlockType,
  PromptZones,
} from "@/app/lib/types/assessment";

export const TOKEN_RE = /@[A-Za-z_]\w*|\{[A-Za-z_]\w*\}|<[A-Za-z_]\w*>/g;

export const PROMPT_FIELD_TYPE_LABELS: Record<PromptFieldType, string> = {
  text: "Text",
  image: "Image (link)",
  pdf: "PDF (link)",
};

export function tokenName(raw: string): string {
  return raw.startsWith("@") ? raw.slice(1) : raw.slice(1, -1);
}

export function fieldTypeOf(
  fieldTypes: Record<string, PromptFieldType>,
  name: string,
): PromptFieldType {
  return fieldTypes[name] ?? "text";
}

/** Text columns stay `@Column`; image/PDF columns read as `<Column>`. */
export function canonicalToken(name: string, type: PromptFieldType): string {
  return type === "text" ? `@${name}` : `<${name}>`;
}

function segmentKind(
  name: string,
  columns: string[],
  fieldTypes: Record<string, PromptFieldType>,
): PromptSegment["kind"] {
  if (!columns.includes(name)) return "unknown";
  return fieldTypeOf(fieldTypes, name) === "text" ? "text" : "attachment";
}

/** Splits prompt text into plain runs and tokens, for highlighting and preview. */
export function splitTokens(
  text: string,
  columns: string[],
  fieldTypes: Record<string, PromptFieldType>,
): PromptSegment[] {
  const segments: PromptSegment[] = [];
  let last = 0;

  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ kind: "plain", text: text.slice(last, index) });
    }
    const name = tokenName(match[0]);
    segments.push({
      kind: segmentKind(name, columns, fieldTypes),
      text: match[0],
      name,
    });
    last = index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ kind: "plain", text: text.slice(last) });
  }
  return segments;
}

/** Rewrites every reference to `name` into the form its type implies. */
export function rewriteToken(
  text: string,
  name: string,
  type: PromptFieldType,
): string {
  const pattern = new RegExp(`(@${name}\\b|\\{${name}\\}|<${name}>)`, "g");
  return text.replace(pattern, canonicalToken(name, type));
}

const BLOCK_PREFIXES: { prefix: string; type: PreviewBlockType }[] = [
  { prefix: "## ", type: "h2" },
  { prefix: "# ", type: "h1" },
  { prefix: "- ", type: "li" },
];

function blockOf(line: string): { type: PreviewBlockType; body: string } {
  const matched = BLOCK_PREFIXES.find(({ prefix }) => line.startsWith(prefix));
  return matched
    ? { type: matched.type, body: line.slice(matched.prefix.length) }
    : { type: "p", body: line };
}

/**
 * The preview document: instructions then submission under mirrored headings,
 * with tokens resolved against row 1 of the selected submission set.
 */
export function buildPreviewBlocks(params: {
  zones: PromptZones;
  columns: string[];
  fieldTypes: Record<string, PromptFieldType>;
  sampleRow: Record<string, string>;
}): PreviewBlock[] {
  const { zones, columns, fieldTypes, sampleRow } = params;
  const source: string[] = [];
  if (zones.instructions.trim()) {
    source.push("# Instructions", zones.instructions);
  }
  if (zones.submission.trim()) {
    source.push("# Submission", zones.submission);
  }

  return source
    .join("\n\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const { type, body } = blockOf(line);
      return {
        type,
        segments: resolveSegments(body, columns, fieldTypes, sampleRow),
      };
    });
}

const PREVIEW_VALUE_LIMIT = 260;

function resolveSegments(
  text: string,
  columns: string[],
  fieldTypes: Record<string, PromptFieldType>,
  sampleRow: Record<string, string>,
): PromptSegment[] {
  return splitTokens(text, columns, fieldTypes).map((segment) => {
    if (segment.kind !== "text" || !segment.name) return segment;
    const value = sampleRow[segment.name];
    if (!value) return { ...segment, kind: "unknown" };
    return {
      ...segment,
      text:
        value.length > PREVIEW_VALUE_LIMIT
          ? `${value.slice(0, PREVIEW_VALUE_LIMIT)}…`
          : value,
    };
  });
}

/**
 * Editor text → wire payload. `prompt_template` keeps the `{Column}` form the
 * backend already accepts; image/PDF columns also travel in `attachments`.
 */
export function toWireTemplate(
  text: string,
  fieldTypes: Record<string, PromptFieldType>,
): { template: string; attachments: Attachment[] } {
  const attachments: Attachment[] = [];

  const template = text.replace(TOKEN_RE, (raw) => {
    const name = tokenName(raw);
    const type = fieldTypeOf(fieldTypes, name);
    if (type !== "text" && !attachments.some((item) => item.column === name)) {
      attachments.push({ column: name, type, format: "url" });
    }
    return `{${name}}`;
  });

  return { template, attachments };
}

/** Wire payload → editor text, so a saved version reopens as it was authored. */
export function fromWireTemplate(
  template: string,
  attachments: Attachment[],
): string {
  const byColumn = new Map(attachments.map((item) => [item.column, item.type]));
  return template.replace(TOKEN_RE, (raw) => {
    const name = tokenName(raw);
    const type = byColumn.get(name);
    return type && type !== "mixed" ? `<${name}>` : `@${name}`;
  });
}

export function fieldTypesFromAttachments(
  attachments: Attachment[],
): Record<string, PromptFieldType> {
  return Object.fromEntries(
    attachments
      .filter((item) => item.type !== "mixed")
      .map((item) => [item.column, item.type as PromptFieldType]),
  );
}
