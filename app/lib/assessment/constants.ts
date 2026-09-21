import type {
  PostProcessingConfig,
  PostProcessingFilterRule,
  ResultTone,
  SchemaPropertyType,
  Step,
} from "@/app/lib/types/assessment";

export const ASSESSMENT_TAG = "ASSESSMENT" as const;
export const ASSESSMENT_FEATURE_FLAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_TAG = ASSESSMENT_TAG;
export const ASSESSMENT_CONFIG_VERSION_PAGE_SIZE = 8;

export const ASSESSORS_PER_PAGE = 8;
/** Typing settles before the assessors search hits the API. */
export const ASSESSOR_SEARCH_DEBOUNCE_MS = 300;
export const RUNS_PER_PAGE = 4;
export const PAGER_WINDOW_SIZE = 3;

/** One cadence for the runs list and an open results tab. A batch run takes
 * minutes, and each detail poll streams two objects out of storage. */
export const RESULTS_POLL_INTERVAL_MS = 60_000;

export const ASSESSMENT_BATCH_ENDPOINT = "/api/assessment/batch";
export const TERMINAL_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "completed",
  "completed_with_errors",
  "failed",
]);

/** Step 4's preview is a sanity check on the chosen set, not a data browser. */
export const RUN_PREVIEW_ROW_LIMIT = 10;

/** Result-row key conventions the table and the detail modal both read. */
export const RESULT_SCORE_SUFFIX = "_score";
export const RESULT_REASON_SUFFIX = "_reason";
export const PREFILTER_DECISION_KEY = "prefilter_decision";
export const PREFILTER_REASONING_KEY = "prefilter_reasoning";
/** Keys a nested `{score, reason}` output object may use. */
export const SCORE_OBJECT_KEYS = ["score", "value", "rating"] as const;
export const REASON_OBJECT_KEYS = ["reason", "reasoning", "rationale"] as const;
/** Applied when an output key collides with an input column. */
export const ASSESSMENT_OUTPUT_KEY_PREFIX = "assessment_";
export const MAX_OUTPUT_FLATTEN_DEPTH = 2;
export const SPREADSHEET_STATE_STORAGE_PREFIX = "kaapi_sheet_state_";
export const SPREADSHEET_STATE_SCHEMA_VERSION = 1;
export const SPREADSHEET_STATE_DEBOUNCE_MS = 800;
export const SPREADSHEET_PREVIEW_ROW_LIMIT = 5000;

export const MAX_DATASET_FILE_BYTES = 5 * 1024 * 1024;
export const DATASET_SAMPLE_ROW_LIMIT = 10;
/** Results join the whole submission back in, not a sample of it. The backend
 * rejects an oversized `limit_rows`, so this is only the fallback for when the
 * run's own row count is unknown. */
export const SUBMISSION_INPUT_ROW_LIMIT = 1000;

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
/** The BATCH pipeline has two stages, and a run without a pre-filter has one. */
export const STAGE_LABELS: Record<string, string> = {
  topic_relevance: "Pre-filter",
  assessment: "Assessment",
};

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

/** The v2 flow strip, shown on Home (inert) and inside the wizard (live). */
export const ASSESSMENT_WIZARD_STEPS: Step[] = [
  { id: 1, label: "Submission" },
  { id: 2, label: "Pre-filter (opt.)" },
  { id: 3, label: "Assessment" },
  { id: 4, label: "Run assessment" },
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

/** The create-submission form sits to the right of the list, at a fixed width. */
export const SUBMISSION_FORM_PANEL_CLASSES =
  "w-[40%] min-w-[360px] max-w-[500px]";
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

export const UNIVER_MUTATION_TYPE = 2;
