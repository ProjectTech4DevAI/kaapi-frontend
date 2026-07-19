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

export interface PromptImprovementJobPublic {
  job_id: string;
  status: PromptImprovementStatus;
  config_version: PromptImprovementConfigVersion | null;
  error_message: string | null;
}

export interface PromptImprovementJobSnapshot {
  job_id: string;
  status: PromptImprovementStatus;
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
