/**
 * Pure derivations for the Assessment Home surface: run rows, the runs filter
 * vocabulary, and assessor search. No React, no network.
 */
import {
  RUN_FILTER_ALL,
  type AssessmentRun,
  type AssessorSummary,
  type HomeRunRow,
  type RunFilterValue,
} from "@/app/lib/types/assessment";
import {
  getStageProgress,
  isActiveStatus,
  type StageProgress,
} from "@/app/lib/assessment/results";

export const assessorFilterValue = (configId: string) => `a:${configId}`;
export const versionFilterValue = (configId: string, version: number) =>
  `v:${configId}:${version}`;

/** One execution per assessment, so the row reads its config pin off the run. */
export function buildHomeRunRows(
  assessments: AssessmentRun[],
  assessors: AssessorSummary[],
): HomeRunRow[] {
  const byId = new Map(assessors.map((item) => [item.id, item]));

  return assessments.map((assessment) => toRunRow(assessment, byId));
}

/** A run's rail is its own stages — the API reports what this run actually has. */
function stagesOf(assessment: AssessmentRun): StageProgress[] {
  const stages = assessment.stages ?? [];
  if (!assessment.stage || stages.length === 0) return [];
  return getStageProgress({
    stage: assessment.stage,
    stage_status: assessment.stage_status ?? null,
    pipeline: {
      stages: stages.map((stage, index) => ({ stage, order: index + 1 })),
    },
  });
}

function assessorFacts(assessor: AssessorSummary | undefined): {
  assessorName: string;
} {
  return { assessorName: assessor?.name ?? "Deleted assessor" };
}

function toRunRow(
  assessment: AssessmentRun,
  assessors: Map<string, AssessorSummary>,
): HomeRunRow {
  const configId = assessment.config?.id ?? "";
  const assessor = assessors.get(configId);

  return {
    assessment,
    ...assessorFacts(assessor),
    version: assessment.config?.version ?? null,
    cost: null,
    stages: stagesOf(assessment),
    isActive: isActiveStatus(assessment.status),
  };
}

/**
 * Version entries come from the runs themselves: an assessor's version list is
 * only fetched when its row is opened, and a version nothing ran under would
 * filter to an empty table anyway.
 */
export function buildRunFilterOptions(
  assessors: AssessorSummary[],
  assessments: AssessmentRun[],
): { value: string; label: string }[] {
  const options = [{ value: RUN_FILTER_ALL, label: "All runs" }];

  assessors.forEach((assessor) => {
    options.push({
      value: assessorFilterValue(assessor.id),
      label: `${assessor.name} — all versions`,
    });

    const versions = [
      ...new Set(
        assessments
          .filter((run) => run.config?.id === assessor.id)
          .map((run) => run.config?.version)
          .filter((version): version is number => typeof version === "number"),
      ),
    ].sort((left, right) => right - left);

    versions.forEach((version) => {
      options.push({
        value: versionFilterValue(assessor.id, version),
        label: `${assessor.name} v${version}`,
      });
    });
  });

  return options;
}

export function matchesRunFilter(
  row: HomeRunRow,
  filter: RunFilterValue,
): boolean {
  if (filter === RUN_FILTER_ALL) return true;
  const config = row.assessment.config;
  if (!config?.id) return false;

  if (filter.startsWith("a:")) return config.id === filter.slice(2);

  const [, configId, version] = filter.split(":");
  return config.id === configId && config.version === Number(version);
}
