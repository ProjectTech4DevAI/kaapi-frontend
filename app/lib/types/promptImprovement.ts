export type PromptImprovementStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

export interface LLMJobImmediatePublic {
  job_id: string;
  status: PromptImprovementStatus;
  message?: string | null;
  job_inserted_at?: string;
  job_updated_at?: string;
}

import type { ConfigVersionPublic } from "@/app/lib/types/configs";

export type PromptImprovementConfigVersion = ConfigVersionPublic;

/** Only "prompt" exists today; the backend will widen this to a union as
 * more recommendation types (e.g. config) are added. */
export type RecommendationType = "prompt";

export interface PromptRecommendationJobPublic {
  job_id: string;
  status: PromptImprovementStatus;
  recommendation_type: RecommendationType;
  config_version: PromptImprovementConfigVersion | null;
  error_message: string | null;
}

export interface PromptImprovementJobSnapshot {
  job_id: string;
  status: PromptImprovementStatus;
  recommendation_type: RecommendationType;
  config_version: PromptImprovementConfigVersion | null;
  error_message: string | null;
  updated_at: string;
}

export interface UsePromptImprovementArgs {
  jobId: string;
  apiKey: string;
  isAuthenticated: boolean;
}

export interface UsePromptImprovementResult {
  isImprovingPrompt: boolean;
  handleIteratePrompt: () => Promise<void>;
}

export type IterateSettle = (
  result:
    | { status: "SUCCESS"; version: PromptImprovementConfigVersion }
    | { status: "FAILED"; message: string | null },
) => void;

export interface JobSnapshotLike {
  status: string;
  config_version: PromptImprovementConfigVersion | null;
  error_message: string | null;
}

export type SnapshotListener = (snapshot: PromptImprovementJobSnapshot) => void;

export interface PromptImprovementStoreShape {
  jobs: Map<string, PromptImprovementJobSnapshot>;
  listeners: Map<string, Set<SnapshotListener>>;
}
