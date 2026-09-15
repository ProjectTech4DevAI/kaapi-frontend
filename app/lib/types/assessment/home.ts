// Assessment types: Home surface (assessors panel, runs panel, version selection).
import type { PageSlice } from "./core";
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
