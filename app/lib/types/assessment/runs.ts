import type { ReactNode } from "react";
import type {
  AssessmentStatusValue,
  AssessmentSummary,
  BatchCounts,
  PageSlice,
} from "./core";
import type { AssessorSummary, AssessorVersion } from "./assessor";
import type { WizardContext } from "./wizard";

export type AssessmentRun = AssessmentSummary;

export type FlatResultRow = Record<string, unknown>;

export interface PipelineStageEntry {
  stage: string;
  type?: string;
  order?: number;
}

export interface PipelineConfig {
  stages: PipelineStageEntry[];
}

export type StageProgressStatus =
  | "completed"
  | "processing"
  | "pending"
  | "failed";

export interface StageProgress {
  stage: string;
  label: string;
  status: StageProgressStatus;
}

export interface StageProgressInput {
  stage: string | null;
  stage_status: string | null;
  pipeline: PipelineConfig | null;
}

export interface PostProcessingComputedColumn {
  name: string;
  formula: string;
}

export interface PostProcessingSortRule {
  column: string;
  direction: "asc" | "desc";
}

export interface PostProcessingFilterRule {
  column: string;
  op:
    | "eq"
    | "ne"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "not_contains"
    | "is_empty"
    | "is_not_empty";
  value?: string | number;
}

export interface PostProcessingConfig {
  computed_columns: PostProcessingComputedColumn[];
  sort: PostProcessingSortRule[];
  filter: PostProcessingFilterRule[];
}

export type ResultTone = "default" | "warning" | "success" | "error";
export type AssessmentTag = "ASSESSMENT";

export type UniverCommandInfo = {
  id: string;
  type?: number;
  params?: unknown;
};

export type UniverAPI = {
  dispose?: () => void;
  onCommandExecuted: (cb: (info: UniverCommandInfo) => void) => {
    dispose: () => void;
  };
  getActiveWorkbook: () => { save: () => object } | null;
  createUniverSheet: (d: object) => void;
};

export type SpreadsheetStateEnvelope = {
  v: number;
  ts: number;
  data: object;
};

export type SpreadsheetCellEntry = {
  v: string | number;
  t: number;
  s?: object;
};

export type SpreadsheetSnapshot = {
  sheetOrder?: string[];
  sheets?: Record<
    string,
    { cellData?: Record<string, Record<string, { v?: unknown }>> }
  >;
};

export interface OwnedValue<T> {
  owner: string;
  value: T;
}

export interface UseRunResultsResult {
  results: FlatResultRow[];
  headers: string[];
  rows: string[][];
  status: AssessmentStatusValue | null;
  counts: BatchCounts | null;
  totalItems: number;
  isPolling: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ChildRunStageProgressProps {
  stages: StageProgress[];
}

export interface ResultsToolbarProps {
  title: string;
  subtitle: string;
  onBack: () => void;
  onDownload: () => void;
}

export interface SpreadsheetViewProps {
  runId: string;
  headers: string[];
  rows: string[][];
}

export interface AssessorSelection {
  configId: string;
  version: number;
}

export type RunFilterValue = string;

export const RUN_FILTER_ALL = "all";

export interface HomeRunRow {
  assessment: AssessmentRun;
  assessorName: string;
  version: number | null;
  cost: string | null;
  stages: StageProgress[];
  isActive: boolean;
}

export interface UseAssessmentHomeDataResult {
  assessors: AssessorSummary[];
  knownAssessors: AssessorSummary[];
  hasPrevAssessors: boolean;
  hasNextAssessors: boolean;
  showPrevAssessors: () => void;
  showNextAssessors: () => void;
  assessorSearch: string;
  setAssessorSearch: (value: string) => void;
  assessments: AssessmentRun[];
  versionsByAssessor: Record<string, AssessorVersion[]>;
  loadVersions: (configId: string) => Promise<AssessorVersion[]>;
  deleteAssessor: (configId: string) => Promise<void>;
  deleteAssessorVersion: (configId: string, version: number) => Promise<void>;
  deletingKey: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseAssessmentHomeResult {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  assessors: AssessorSummary[];
  hasPrevAssessors: boolean;
  hasNextAssessors: boolean;
  showPrevAssessors: () => void;
  showNextAssessors: () => void;
  assessorSearch: string;
  setAssessorSearch: (value: string) => void;
  expandedAssessorIds: ReadonlySet<string>;
  toggleAssessorExpanded: (configId: string) => void;
  versionsByAssessor: Record<string, AssessorVersion[]>;

  selection: AssessorSelection | null;
  selectAssessor: (configId: string) => void;
  selectVersion: (configId: string, version: number) => void;
  deleteAssessor: (configId: string) => Promise<void>;
  deleteAssessorVersion: (configId: string, version: number) => Promise<void>;
  deletingKey: string | null;

  runSlice: PageSlice<HomeRunRow>;
  runFilter: RunFilterValue;
  setRunFilter: (value: RunFilterValue) => void;
  runFilterOptions: { value: string; label: string }[];
  gotoRunPage: (page: number) => void;
}

export type DeleteTarget =
  | { kind: "assessor"; configId: string; name: string }
  | { kind: "version"; configId: string; version: number };

export interface HomeViewProps {
  initialSelection: AssessorSelection | null;
  onNewAssessor: () => void;
  onEditVersion: (context: WizardContext) => void;
  onNewRun: (context: WizardContext) => void;
}

export interface HomePanelProps {
  title: string;
  headerActions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  countLabel: string;
  page?: number;
  pages?: number;
  onGoto?: (page: number) => void;
  cursor?: {
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
  className?: string;
}

export interface AssessorsPanelProps {
  home: UseAssessmentHomeResult;
  onNewAssessor: () => void;
  onEditVersion: () => void;
}

export interface AssessorRowProps {
  assessor: AssessorSummary;
  selection: AssessorSelection | null;
  versions: AssessorVersion[] | undefined;
  isExpanded: boolean;
  deletingKey: string | null;
  onSelectAssessor: (configId: string) => void;
  onSelectVersion: (configId: string, version: number) => void;
  onToggleExpanded: (configId: string) => void;
  onRequestDeleteAssessor: (assessor: AssessorSummary) => void;
  onRequestDeleteVersion: (configId: string, version: number) => void;
}

export interface AssessorVersionChipsProps {
  assessor: AssessorSummary;
  versions: AssessorVersion[] | undefined;
  chipCount: number;
  selectedVersion: number | null;
  isExpanded: boolean;
  onSelectVersion: (configId: string, version: number) => void;
  onToggleExpanded: (configId: string) => void;
}

export interface AssessorVersionListProps {
  configId: string;
  versions: AssessorVersion[] | undefined;
  selectedVersion: number | null;
  deletingKey: string | null;
  onSelectVersion: (configId: string, version: number) => void;
  onRequestDeleteVersion: (configId: string, version: number) => void;
}

export interface DeleteAssessorDialogProps {
  target: DeleteTarget;
  onCancel: () => void;
  onConfirm: () => void;
}

export interface RunsPanelProps {
  home: UseAssessmentHomeResult;
  onNewRun: () => void;
}

export interface RunRowProps {
  row: HomeRunRow;
}

export interface RunRowActionsProps {
  row: HomeRunRow;
}

export interface RunRowMetaProps {
  row: HomeRunRow;
}
