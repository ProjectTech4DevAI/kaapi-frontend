import type {
  ColumnRole,
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

export const ACTIVE_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "processing",
  "in_progress",
]);
export const FAILED_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "failed",
  "completed_with_errors",
]);
export const COMPLETED_ASSESSMENT_STATUSES: ReadonlySet<string> = new Set([
  "completed",
]);

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
  { id: 2, label: "Prompt & Config" },
  { id: 3, label: "Review" },
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
  input: 3,
  configs: 4,
  schema: 5,
} as const;

export const INITIAL_REVIEW_OPEN_SECTIONS = new Set<number>(
  Object.values(REVIEW_SECTIONS),
);

export const DEFAULT_SYSTEM_PROMPT = "(not set)";
export const DEFAULT_USER_PROMPT =
  "(not set: backend concatenates mapped text columns)";

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
