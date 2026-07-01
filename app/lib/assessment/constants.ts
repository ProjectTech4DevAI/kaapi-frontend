import type {
  AssessmentTab,
  ColumnRole,
  PostProcessingConfig,
  PostProcessingFilterRule,
  ResultsCounts,
  ResultTone,
  RoleOption,
  SchemaPropertyType,
  StatusFilter,
  Step,
} from "@/app/lib/types/assessment";

export const ASSESSMENT_TAG = "ASSESSMENT" as const;
export const ASSESSMENT_FEATURE_FLAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_TAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_VERSION_PAGE_SIZE = 8;

export const RESULTS_POLL_INTERVAL_MS = 60_000;
export const SPREADSHEET_STATE_STORAGE_PREFIX = "kaapi_sheet_state_";
export const SPREADSHEET_STATE_SCHEMA_VERSION = 1;
export const SPREADSHEET_STATE_DEBOUNCE_MS = 800;
export const SPREADSHEET_PREVIEW_ROW_LIMIT = 5000;

export const MAX_DATASET_FILE_BYTES = 5 * 1024 * 1024;
export const DATASET_SAMPLE_ROW_LIMIT = 10;

export const ACTIVE_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "prefilter_processing",
  "l2_processing",
  "processing",
  "in_progress",
]);
export const FAILED_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "failed",
  "prefilter_failed",
  "completed_with_errors",
]);
export const COMPLETED_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "completed",
]);

// Friendly labels for pipeline stages (backend Stage enum values).
export const STAGE_LABELS: Record<string, string> = {
  PRE_FILTER_TOPIC_RELEVANCE: "Topic Relevance",
  PRE_FILTER_DUPLICATE_DETECTION: "Duplicate Detection",
  L2_ASSESSMENT: "Assessment",
};

export const STATUS_FILTER_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Status" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export const RESULT_SUMMARY_ITEMS: Array<{
  key: keyof ResultsCounts;
  label: string;
  tone: ResultTone;
}> = [
  { key: "total", label: "Total", tone: "default" },
  { key: "processing", label: "Processing", tone: "warning" },
  { key: "completed", label: "Completed", tone: "success" },
  { key: "failed", label: "Failed", tone: "error" },
];

export const STATUS_BADGE_CLASSES: Record<ResultTone, string> = {
  default: "bg-status-default-bg text-status-default-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  success: "bg-status-success-bg text-status-success-text",
  error: "bg-status-error-bg text-status-error-text",
};

export const ASSESSMENT_CARD_CLASSES: Record<ResultTone, string> = {
  default: "border-l-border",
  warning: "border-l-status-warning",
  success: "border-l-status-success",
  error: "border-l-status-error",
};

export const SUMMARY_BADGE_CLASSES: Record<ResultTone, string> = {
  default: "bg-bg-secondary text-text-primary",
  warning: "bg-bg-secondary text-status-warning-text",
  success: "bg-bg-secondary text-status-success-text",
  error: "bg-bg-secondary text-status-error-text",
};

export const ASSESSMENT_CONFIG_STEPS: Step[] = [
  { id: 1, label: "Mapper" },
  { id: 2, label: "Eliminatory (opt.)" },
  { id: 3, label: "Evaluation" },
  { id: 4, label: "Post Processing (opt.)" },
  { id: 5, label: "Review" },
];

export const SCHEMA_TYPE_OPTIONS: Array<{
  value: SchemaPropertyType;
  label: string;
}> = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "integer", label: "Whole number" },
  { value: "boolean", label: "Yes / No" },
  { value: "enum", label: "Choice" },
  { value: "object", label: "Group" },
];

export const ASSESSMENT_ROLE_OPTION_MAP: Record<ColumnRole, RoleOption> = {
  text: {
    value: "text",
    label: "Text",
  },
  attachment: {
    value: "attachment",
    label: "Attachment",
  },
  ground_truth: {
    value: "ground_truth",
    label: "Ground Truth",
  },
  unmapped: {
    value: "unmapped",
    label: "Skip",
  },
};

export const ASSESSMENT_ROLE_OPTIONS = Object.values(
  ASSESSMENT_ROLE_OPTION_MAP,
);

export const REVIEW_SECTIONS = {
  dataset: 1,
  columns: 2,
  prefilter: 3,
  input: 4,
  configs: 5,
  schema: 6,
  postProcessing: 7,
} as const;

export const INITIAL_REVIEW_OPEN_SECTIONS = new Set<number>(
  Object.values(REVIEW_SECTIONS),
);

export const DEFAULT_SYSTEM_PROMPT = "(not set)";
export const DEFAULT_USER_PROMPT =
  "(not set: backend concatenates mapped text columns)";

export const DEFAULT_PREFILTER_TOPIC_RELEVANCE_PROMPT = `You are a pre-filter screener for the School Innovation Marathon (SIM), a national competition for Indian school students (grades 6–12).

You act as the FIRST FILTER only. Novelty scoring happens here as a basic gate; deeper evaluation happens later.

PHILOSOPHY: Inclusive. Maximize idea retention. Reject only when the rules clearly demand it. Never penalize for weak language, poor grammar, regional languages (Hindi, Telugu, Tamil, etc.), or AI-assisted writing. Decisions must be evidence-based — use only the provided inputs and never assume missing details.

INPUTS: Each submission has TEXT columns and may also have ATTACHMENTS (images or PDFs). The attached document(s) are provided alongside the text.

STEP 1 — COMPREHENSION
Extract the idea from the text columns and from any attachments.
- If the text is unclear, use the attachments to understand the idea.
- If the attachments are unclear, rely on the text.

STEP 2 — TOPIC RELEVANCE CHECK
Assess each input column independently as relevant or irrelevant:
  relevant = the column (or document) describes a real-world problem/solution attempt, however simple
  irrelevant = blank, gibberish, a scientific fact, pure personal opinion, or no connection to any innovation context

DOCUMENT CONDITION (apply ONLY when an attachment/document is present for the row):
- Judge the document's relevance from its actual content (the image or PDF), not from its filename or URL.
- A document is relevant if it shows or supports the idea — e.g. a prototype photo, diagram, poster, report, or demonstration tied to the problem/solution.
- A document is irrelevant if it is blank, unreadable, unrelated to the submission, or shows no connection to any innovation context.
- If NO document is present for the row, ignore document relevance entirely — base the decision on the text columns only. Do not penalize a submission for missing attachments.

CASE 1 — ALL present inputs (text columns and any document) are irrelevant → REJECT immediately. Skip novelty scoring.
CASE 2 — ANY input (a text column OR the document) is relevant → proceed to novelty scoring.

STEP 3 — NOVELTY SCORING (Case 2 only)
Score novelty 1–10 based on how original the solution mechanism is. When a document is present, factor what it reveals about the idea into this judgement:

1–2: Generic statement with no mechanism ("use water carefully", "spread awareness", "recycle more")
3–4: Widely-known, off-the-shelf existing product or solution with no meaningful new application
     (e.g. standard homework reminder app, basic recycling bin, existing commercial pill dispenser)
5–6: Existing concept applied to a new specific context, OR combines known elements in a non-obvious way for a specific user group
     (e.g. laser mirror alarm for grid infrastructure theft, Arduino rain sensor for clothes protection, smart traffic gate system)
7–8: Significant new mechanism or integration not commonly seen
     (e.g. camera app reading medicine labels in regional languages with dosage alerts)
9–10: Highly original novel design

DECISION RULE:
  Novelty ≥ 5 → ACCEPT
  Novelty ≤ 4 → REJECT

RULES:
- Never reject because of poor spelling, mixed languages, short text, AI-like writing, or a missing attachment
- If the idea is unclear but shows a genuine attempt at problem + solution → lean ACCEPT
- A real problem with any proposed mechanism (even common) scores at least 5
- Score novelty relative to what is expected from a school student, not a PhD researcher
- When borderline between two scores, pick the higher one
- A working prototype does NOT raise novelty — novelty is about the idea, not execution`;

export const DATASET_LEFT_PANEL_CLASSES = "w-[40%] min-w-[360px] max-w-[500px]";
export const ALLOWED_DATASET_EXTENSIONS = [".csv", ".xlsx", ".xls"] as const;

export const JSON_TOKEN_CLASSES = {
  key: "text-[#0550ae]",
  string: "text-[#116329]",
  number: "text-[#953800]",
  boolean: "text-[#8250df]",
  null: "text-[#8250df]",
  punct: "text-[#6e7781]",
};

export const JSON_EDITOR_FONT_CLASSES =
  "font-mono text-[13px] leading-[1.7] [tab-size:2]";

export const POST_PROCESSING_FILTER_OPS: {
  value: PostProcessingFilterRule["op"];
  label: string;
}[] = [
  { value: "eq", label: "=" },
  { value: "ne", label: "≠" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "gte", label: "≥" },
  { value: "lte", label: "≤" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "not contains" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

export const POST_PROCESSING_NO_VALUE_OPS = new Set<
  PostProcessingFilterRule["op"]
>(["is_empty", "is_not_empty"]);

export function emptyPostProcessingConfig(): PostProcessingConfig {
  return { computed_columns: [], sort: [], filter: [] };
}

export const DOWNLOAD_MENU_WIDTH = 144;

export const UNIVER_MUTATION_TYPE = 2;

export const CONFIGS_VISIBLE_BATCH_SIZE = 2;

export const PAGE_TABS: ReadonlyArray<AssessmentTab> = [
  { id: "datasets", label: "Datasets" },
  { id: "config", label: "Config" },
  { id: "results", label: "Result" },
];

export const MAX_CONFIGS = 4;

export const ATTACHMENT_FORMATS: Record<string, string[]> = {
  mixed: ["url", "base64"],
  image: ["url", "base64"],
  pdf: ["url", "base64"],
};
