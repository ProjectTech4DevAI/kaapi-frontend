// Helpers for the Submission template ({column} placeholders) and its
// client-side persistence.
//
// The backend substitutes single-brace {column} tokens (text columns only) and
// does not yet persist the template inside the config blob: the blob is sent
// with a `query_template` param for forward compatibility, but the backend's
// param validation drops unknown keys today. Until that lands, the template is
// mirrored to localStorage per saved config version so the author gets it back
// when reloading a config.

const TEMPLATE_STORE_PREFIX = "kaapi_assessment_submission_template:";

export function templateStoreKey(configId: string, version: number): string {
  return `${TEMPLATE_STORE_PREFIX}${configId}:${version}`;
}

export function loadStoredSubmissionTemplate(
  configId: string,
  version: number,
): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(templateStoreKey(configId, version)) ?? ""
    );
  } catch {
    return "";
  }
}

export function storeSubmissionTemplate(
  configId: string,
  version: number,
  template: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(templateStoreKey(configId, version), template);
  } catch {
    // Storage full/unavailable — the template still rides in the blob param.
  }
}

// Matches the backend's naive `{column}` replacement: no braces or newlines
// inside a token.
const TOKEN_PATTERN = /\{([^{}\n]+)\}/g;

// Unique token names in order of first appearance.
export function extractTemplateTokens(template: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const match of template.matchAll(TOKEN_PATTERN)) {
    const name = match[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    tokens.push(name);
  }
  return tokens;
}

// Remove every {name} token (used when a field becomes an attachment — the
// backend would leave the token in the prompt as literal text).
export function stripTokenFromTemplate(template: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return template
    .replace(new RegExp(`[ \\t]?\\{${escaped}\\}`, "g"), "")
    .replace(/[ \t]{2,}/g, " ");
}

export interface DatasetCompatibility {
  // input_schema columns the dataset does not have (run would 422).
  missingInDataset: string[];
  // dataset columns the config does not declare (run would 422 — the backend
  // requires exact set equality).
  extraInDataset: string[];
}

export function diffDatasetCompatibility(
  datasetHeaders: string[],
  inputSchemaColumns: string[],
): DatasetCompatibility {
  const headers = new Set(datasetHeaders.map((h) => h.trim()).filter(Boolean));
  const declared = new Set(inputSchemaColumns);
  return {
    missingInDataset: inputSchemaColumns.filter((col) => !headers.has(col)),
    extraInDataset: [...headers].filter((col) => !declared.has(col)),
  };
}

// Heuristic used to suggest an attachment type for a field from a sample cell.
export function suggestFieldTypeFromSample(
  sample: string | undefined,
): "image" | "pdf" | null {
  if (!sample) return null;
  const value = sample.trim().toLowerCase();
  if (!value.startsWith("http://") && !value.startsWith("https://"))
    return null;
  if (/\.pdf(\?|#|$)/.test(value)) return "pdf";
  if (/\.(png|jpe?g|gif|webp|bmp|tiff?)(\?|#|$)/.test(value)) return "image";
  // A URL of unknown kind: still likely an attachment; default suggestion pdf
  // is too strong, so just flag as image-or-pdf via null with a URL hint left
  // to the caller (it checks isLikelyUrl separately).
  return null;
}

export function isLikelyUrl(sample: string | undefined): boolean {
  if (!sample) return false;
  const value = sample.trim().toLowerCase();
  return value.startsWith("http://") || value.startsWith("https://");
}

// The pre-filter has no server-side user template: its user message is the
// bare column values joined by newlines, and only `instructions` carries
// author text. Until the backend supports a pre-filter query template, the
// pre-filter's Submission text is embedded into the sent instructions behind
// this marker and split back out on load.
export const PREFILTER_SUBMISSION_MARKER = "\n\n[Submission to judge]\n";

const PREFILTER_SUBMISSION_PREAMBLE =
  "\nThe submission's column values follow in the message; {column} names refer to them.\n";

export function joinPrefilterInstructions(
  criteria: string,
  submissionTemplate: string,
): string {
  const trimmedCriteria = criteria.trim();
  const trimmedTemplate = submissionTemplate.trim();
  if (!trimmedTemplate) return trimmedCriteria;
  return `${trimmedCriteria}${PREFILTER_SUBMISSION_MARKER}${trimmedTemplate}${PREFILTER_SUBMISSION_PREAMBLE}`;
}

export function splitPrefilterInstructions(instructions: string): {
  criteria: string;
  submissionTemplate: string;
} {
  const index = instructions.lastIndexOf(PREFILTER_SUBMISSION_MARKER);
  if (index === -1) return { criteria: instructions, submissionTemplate: "" };
  let template = instructions.slice(index + PREFILTER_SUBMISSION_MARKER.length);
  if (template.endsWith(PREFILTER_SUBMISSION_PREAMBLE)) {
    template = template.slice(0, -PREFILTER_SUBMISSION_PREAMBLE.length);
  }
  return {
    criteria: instructions.slice(0, index),
    submissionTemplate: template,
  };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// HTML for the editor's highlight layer: {tokens} of known text fields get the
// accent style, attachment/unknown tokens get warning styles (the backend
// would leave those in the prompt as literal text).
export function highlightTemplate(
  value: string,
  knownTextFields: string[],
  attachmentFields: string[],
  tokenClasses: { known: string; attachment: string; unknown: string },
): string {
  if (!value) return "";
  const known = new Set(knownTextFields);
  const attachments = new Set(attachmentFields);
  let result = "";
  let cursor = 0;
  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (cursor < index) result += escapeHtml(value.slice(cursor, index));
    const name = match[1].trim();
    const cls = known.has(name)
      ? tokenClasses.known
      : attachments.has(name)
        ? tokenClasses.attachment
        : tokenClasses.unknown;
    result += `<span class="${cls}">${escapeHtml(match[0])}</span>`;
    cursor = index + match[0].length;
  }
  if (cursor < value.length) result += escapeHtml(value.slice(cursor));
  return result;
}

// Render a template with a sample row for previews; unknown tokens stay as-is.
export function renderTemplateWithSample(
  template: string,
  sampleRow: Record<string, string>,
  textColumns: string[],
): string {
  let rendered = template;
  for (const col of textColumns) {
    if (sampleRow[col] === undefined) continue;
    rendered = rendered.split(`{${col}}`).join(sampleRow[col]);
  }
  return rendered;
}
