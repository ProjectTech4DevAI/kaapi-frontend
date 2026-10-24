import type {
  EvalJob,
  GroupedTraceItem,
  IndividualScore,
  NewScoreObjectV2,
  BasicScoreObject,
  OverallScore,
  ScoreObject,
  TraceItem,
} from "@/app/lib/types/evaluation";

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

export function getOverallScore(
  score: ScoreObject | null | undefined,
): OverallScore | null {
  if (!score || !isNewScoreObjectV2(score)) return null;
  return score.overall ?? null;
}

export function getAiSummary(
  score: ScoreObject | null | undefined,
): string | null {
  if (!score || !isNewScoreObjectV2(score)) return null;
  return score.ai_summary ?? null;
}

type VerdictTone = "success" | "warning" | "error" | "default";

const VERDICT_TONE_MAP: Record<string, VerdictTone> = {
  pass: "success",
  passed: "success",
  excellent: "success",
  good: "success",
  warning: "warning",
  moderate: "warning",
  fail: "error",
  failed: "error",
  poor: "error",
  critical: "error",
};

export function getVerdictColor(verdict: string): {
  bg: string;
  border: string;
  text: string;
} {
  const tone = VERDICT_TONE_MAP[verdict.toLowerCase()] ?? "default";
  switch (tone) {
    case "success":
      return {
        bg: "bg-status-success-bg",
        border: "border-status-success-border",
        text: "text-status-success-text",
      };
    case "warning":
      return {
        bg: "bg-status-warning-bg",
        border: "border-status-warning-border",
        text: "text-status-warning-text",
      };
    case "error":
      return {
        bg: "bg-status-error-bg",
        border: "border-status-error-border",
        text: "text-status-error-text",
      };
    default:
      return {
        bg: "bg-status-default-bg",
        border: "border-status-default-border",
        text: "text-status-default-text",
      };
  }
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
