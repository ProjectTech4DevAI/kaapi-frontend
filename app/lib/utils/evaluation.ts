import type {
  EvalJob,
  GroupedTraceItem,
  IndividualScore,
  NewScoreObjectV2,
  BasicScoreObject,
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

export function normalizeToIndividualScores(
  score: ScoreObject | null | undefined,
): IndividualScore[] {
  if (!score || !isNewScoreObjectV2(score)) return [];

  return score.traces.map((trace: TraceItem | GroupedTraceItem) => {
    if ("llm_answer" in trace) {
      return {
        trace_id: trace.trace_id,
        input: { question: trace.question },
        output: { answer: trace.llm_answer },
        metadata: { ground_truth: trace.ground_truth_answer },
        trace_scores: trace.scores,
      };
    }
    return { trace_id: "", trace_scores: [] };
  });
}
