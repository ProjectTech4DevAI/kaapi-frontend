import type {
  EvalJob,
  GroupedTraceItem,
  IndividualScore,
  NewScoreObjectV2,
  BasicScoreObject,
  ScoreObject,
  TraceItem,
} from "@/app/lib/types/evaluation";

export type VerdictBand = "good" | "needs_refinement" | "needs_improvement";

export const VERDICT_LABELS: Record<VerdictBand, string> = {
  good: "Good",
  needs_refinement: "Needs Refinement",
  needs_improvement: "Needs Improvement",
};

/**
 * Judge-metric scores are banded 0-5: Good (4-5), Needs Refinement (2-3),
 * Needs Improvement (0-1). Cosine scores and categorical/N/A entries carry
 * no verdict, so this returns null for them.
 */
export function getVerdictBand(
  value: number | string | null | undefined,
  dataType: "NUMERIC" | "CATEGORICAL" | undefined,
  name?: string,
): VerdictBand | null {
  if (dataType === "CATEGORICAL") return null;
  if (name && /cosine/i.test(name)) return null;
  if (value === null || value === undefined) return null;

  const numValue = Number(value);
  if (!Number.isFinite(numValue)) return null;

  if (numValue >= 4) return "good";
  if (numValue >= 2) return "needs_refinement";
  return "needs_improvement";
}

export function hasSummaryScores(
  score: ScoreObject | null | undefined,
): score is NewScoreObjectV2 | BasicScoreObject {
  if (!score) return false;
  return "summary_scores" in score;
}

export function isNewScoreObjectV2(
  score: ScoreObject | null | undefined,
): score is NewScoreObjectV2 {
  if (!score) return false;
  return "summary_scores" in score && "traces" in score;
}

export function getScoreObject(job: EvalJob): ScoreObject | null {
  return job.scores || job.score || null;
}

export function isGroupedFormat(
  traces: TraceItem[] | GroupedTraceItem[],
): traces is GroupedTraceItem[] {
  if (!traces || traces.length === 0) return false;
  return "llm_answers" in traces[0] && Array.isArray(traces[0].llm_answers);
}

export function normalizeToIndividualScores(
  score: ScoreObject | null | undefined,
): IndividualScore[] {
  if (!score || !isNewScoreObjectV2(score)) return [];

  return score.traces.map((trace: TraceItem | GroupedTraceItem) => {
    if ("llm_answer" in trace) {
      return {
        trace_id: trace.trace_id,
        category: trace.category,
        input: { question: trace.question },
        output: { answer: trace.llm_answer },
        metadata: { ground_truth: trace.ground_truth_answer },
        trace_scores: trace.scores,
      };
    }
    return { trace_id: "", trace_scores: [] };
  });
}
