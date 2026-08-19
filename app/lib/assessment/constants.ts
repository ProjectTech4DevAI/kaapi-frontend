import type {
  AssessmentTab,
  AssessmentTabId,
  PostProcessingConfig,
  PostProcessingFilterRule,
  ResultsCounts,
  ResultTone,
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
  { id: 1, label: "Choose config" },
  { id: 2, label: "Pre-filter (opt.)" },
  { id: 3, label: "Assessment" },
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

// Highlight classes for the prompt editor's {column} tokens.
export const TEMPLATE_TOKEN_CLASSES = {
  known: "rounded bg-accent-subtle/40 text-accent-primary",
  attachment: "rounded bg-status-warning-bg text-status-warning-text",
  unknown:
    "rounded bg-status-warning-bg text-status-warning-text underline decoration-wavy decoration-status-warning",
};

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
  { id: "experiment", label: "Experiment" },
  { id: "results", label: "Runs" },
];

export const MAX_CONFIGS = 4;

// Each tab is its own route (sidebar sub-item). The `results` tab id keeps its
// name for churn reasons but lives at the /assessment/runs URL.
export const ASSESSMENT_TAB_ROUTES: Record<AssessmentTabId, string> = {
  datasets: "/assessment",
  config: "/assessment/config",
  experiment: "/assessment/experiment",
  results: "/assessment/runs",
};

// Reverse map from the /assessment/[tab] URL segment to the tab id.
export const ASSESSMENT_ROUTE_SEGMENT_TO_TAB: Record<string, AssessmentTabId> =
  {
    config: "config",
    experiment: "experiment",
    runs: "results",
  };
