export type TTSTab = "datasets" | "evaluations";

export interface TextSample {
  id: string;
  text: string;
}

export interface TTSDatasetMetadata {
  sample_count?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface TTSDataset {
  id: number;
  name: string;
  description?: string;
  type: string;
  object_store_url: string | null;
  dataset_metadata: TTSDatasetMetadata;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface TTSRunMetadata {
  voice_name?: string;
  style_prompt?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface TTSScore {
  "Speech Naturalness"?: string | null;
  speech_naturalness?: string;
  "Pronunciation Accuracy"?: string | null;
  pronunciation_accuracy?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export interface TTSRun {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  type: string;
  models: string[] | null;
  status: string;
  total_items: number;
  score: TTSScore | null;
  error_message: string | null;
  run_metadata: TTSRunMetadata | null;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface TTSResultRaw {
  id: number;
  sample_text: string;
  object_store_url: string | null;
  duration_seconds: number | null;
  size_bytes: number | null;
  provider: string;
  status: string;
  score: TTSScore | null;
  is_correct: boolean | null;
  comment: string | null;
  error_message: string | null;
  evaluation_run_id: number;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
  signed_url?: string;
  sample?: { signed_url?: string };
}

export interface TTSResult extends Omit<TTSResultRaw, "sample"> {
  signedUrl?: string;
}

// API response types
export interface TTSDatasetsResponse {
  datasets?: TTSDataset[];
  data?: TTSDataset[];
}

export interface TTSRunsResponse {
  runs?: TTSRun[];
  data?: TTSRun[];
}

export interface TTSRunDetailResponse {
  results?: TTSResultRaw[];
  data?: TTSResultRaw[] | { results?: TTSResultRaw[] };
}

export interface TTSDatasetDetailResponse {
  csv_content?: string;
}

export interface TTSCreateDatasetResponse {
  id: number;
  name: string;
}

export interface TTSCreateRunResponse {
  id: number;
  run_name: string;
}

export interface TTSFeedbackPayload {
  is_correct?: boolean | null;
  comment?: string;
  score?: TTSScore;
}

export interface TTSViewDatasetModalData {
  name: string;
  headers: string[];
  rows: string[][];
}
