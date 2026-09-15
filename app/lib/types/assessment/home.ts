// Assessment types: Home surface (assessors panel, runs panel, version selection).
import type { ReactNode } from "react";
import type { PageSlice } from "./core";
import type { WizardContext } from "./wizard";
import type { ResultsTarget } from "./batch";
import type { AssessorSummary, AssessorVersion } from "./dataSource";
import type { AssessmentRun } from "./results";
import type { StageProgress } from "@/app/lib/assessment/results";

/** The version selection that drives Edit, New run, and the runs filter. */
export interface AssessorSelection {
  configId: string;
  version: number;
}

/** `all`, every run of one assessor (`a:<id>`), or one version (`v:<id>:<n>`). */
export type RunFilterValue = string;

export const RUN_FILTER_ALL = "all";

/** A runs-panel row: the run plus the assessor facts the row displays. */
export interface HomeRunRow {
  assessment: AssessmentRun;
  assessorName: string;
  version: number | null;
  cost: string | null;
  stages: StageProgress[];
  isActive: boolean;
}

export interface UseAssessmentHomeResult {
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  /** The current page of assessors; paging is server-side, `has_more` driven. */
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
  /** Config id, or `<configId>:v<n>`, while its delete is in flight. */
  deletingKey: string | null;

  runSlice: PageSlice<HomeRunRow>;
  runFilter: RunFilterValue;
  setRunFilter: (value: RunFilterValue) => void;
  runFilterOptions: { value: string; label: string }[];
  gotoRunPage: (page: number) => void;
  exportRun: (target: ResultsTarget, fileName: string) => Promise<void>;
  exportingId: string | null;
}

/** What a delete confirmation is about: a whole assessor, or one version. */
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
  /** Numbered pages, for a list held entirely in memory. */
  page?: number;
  pages?: number;
  onGoto?: (page: number) => void;
  /** Prev/next only, for a list paged through the API. */
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
  isExporting: boolean;
  onExport: (target: ResultsTarget, fileName: string) => void;
}

export interface RunRowActionsProps {
  row: HomeRunRow;
  isExporting: boolean;
  onExport: (target: ResultsTarget, fileName: string) => void;
}

export interface RunRowMetaProps {
  row: HomeRunRow;
}
