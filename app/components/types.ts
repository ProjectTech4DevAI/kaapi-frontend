/**
 * Shared TypeScript types for evaluation components
 */

// New score structure types
export interface TraceScore {
  name: string;
  value: number | string;
  data_type: 'NUMERIC' | 'CATEGORICAL';
  comment?: string;
}

// New trace format (from evaluation-sample-3.json)
export interface TraceItem {
  trace_id: string;
  question: string;
  llm_answer: string;
  ground_truth_answer: string;
  scores: TraceScore[];
}

export interface GroupedTraceItem {
  question_id: number;
  question: string;
  ground_truth_answer: string;
  llm_answers: string[];
  trace_ids: string[];
  scores: TraceScore[][];
}


// Legacy individual score format (nested structure)
export interface IndividualScore {
  trace_id: string;
  input?: {
    question: string;
  };
  output?: {
    answer: string;
  };
  metadata?: {
    ground_truth?: string;
    item_id?: string;
    response_id?: string;
  };
  trace_scores: TraceScore[];
}

export interface SummaryScore {
  name: string;
  avg?: number;
  std?: number;
  total_pairs: number;
  data_type: 'NUMERIC' | 'CATEGORICAL';
  distribution?: Record<string, number>; // For categorical data
}

// New score object with traces array
export interface NewScoreObjectV2 {
  summary_scores: SummaryScore[];
  traces: TraceItem[] | GroupedTraceItem[];
}

// Legacy score structure (for backward compatibility)
export interface PerItemScore {
  trace_id: string;
  cosine_similarity: number;
}

export interface CosineSimilarity {
  avg: number;
  std: number;
  total_pairs: number;
  per_item_scores: PerItemScore[];
}

export interface LegacyScoreObject {
  cosine_similarity: CosineSimilarity;
}

// Basic score object with only summary scores (no individual scores or traces)
export interface BasicScoreObject {
  summary_scores: SummaryScore[];
}

// Union type to support both old and new structures
export type ScoreObject = NewScoreObjectV2 | BasicScoreObject | LegacyScoreObject;

export interface AssistantConfig {
  name: string;
  model: string;
  knowledge_base_ids: string[];
  project_id: number;
  organization_id: number;
  updated_at: string;
  deleted_at: string | null;
  instructions: string;
  assistant_id: string;
  temperature: number;
  max_num_results: number;
  id: number;
  inserted_at: string;
  is_deleted: boolean;
}

export interface EvalJob {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  batch_job_id: number;
  embedding_batch_job_id: number | null;
  status: string;
  object_store_url: string | null;
  total_items: number;
  score?: ScoreObject | null;
  scores?: ScoreObject | null; // Alternative field name
  error_message: string | null;
  config?: {
    model?: string;
    instructions?: string;
    tools?: unknown[];
    include?: string[];
    temperature?: number;
  };
  config_id?: string;
  config_version?: number;
  model?: string;
  assistant_id?: string;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

// Type guard functions

// Shared guard: Check if score has summary_scores and intelligently narrow to NewScoreObjectV2 or BasicScoreObject
// Priority: If it has traces → NewScoreObjectV2, otherwise → BasicScoreObject
export function hasSummaryScores(score: ScoreObject | null | undefined): score is NewScoreObjectV2 | BasicScoreObject {
  if (!score) return false;
  if (!('summary_scores' in score)) return false;

  // Prioritize traces format if available
  if ('traces' in score) {
    return true; 
  }

  // Otherwise, it's BasicScoreObject (summary_scores only, no traces, no individual_scores)
  return true;
}

export function isNewScoreObjectV2(score: ScoreObject | null | undefined): score is NewScoreObjectV2 {
  if (!score) return false;
  return 'summary_scores' in score && 'traces' in score;
}

export function isBasicScoreObject(score: ScoreObject | null | undefined): score is BasicScoreObject {
  if (!score) return false;
  return 'summary_scores' in score && !('traces' in score);
}

export function isLegacyScoreObject(score: ScoreObject | null | undefined): score is LegacyScoreObject {
  if (!score) return false;
  return 'cosine_similarity' in score;
}

// Helper to get score object from job
export function getScoreObject(job: EvalJob): ScoreObject | null {
  return job.scores || job.score || null;
}

export function isGroupedFormat(traces: TraceItem[] | GroupedTraceItem[]): traces is GroupedTraceItem[] {
  if (!traces || traces.length === 0) return false;
  return "llm_answers" in traces[0] && Array.isArray(traces[0].llm_answers);
}

// Normalize traces to IndividualScore format for table display
export function normalizeToIndividualScores(score: ScoreObject | null | undefined): IndividualScore[] {
  if (!score) return [];

  if (isNewScoreObjectV2(score)) {
    // Convert TraceItem[] to IndividualScore[] for table display
    // Note: Grouped traces should be detected earlier and handled separately
    return score.traces.map((trace: TraceItem | GroupedTraceItem) => {
      // Handle regular TraceItem format
      if ('llm_answer' in trace) {
        return {
          trace_id: trace.trace_id,
          input: { question: trace.question },
          output: { answer: trace.llm_answer },
          metadata: { ground_truth: trace.ground_truth_answer },
          trace_scores: trace.scores
        };
      }
      // Should not reach here if grouped format is handled properly
      return {
        trace_id: '',
        trace_scores: []
      };
    });
  }

  return [];
}