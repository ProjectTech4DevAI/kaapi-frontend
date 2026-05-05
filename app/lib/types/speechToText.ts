export interface AudioFile {
  id: string;
  file: File;
  name: string;
  size: number;
  base64: string;
  mediaType: string;
  groundTruth: string;
  languageId: number;
  fileId?: string;
}

export interface DatasetMetadata {
  sample_count?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  type: string;
  language_id: number | null;
  object_store_url: string | null;
  dataset_metadata: DatasetMetadata;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface STTScore {
  wip: number;
  wer: number;
  cer: number;
  lenient_wer: number;
  [key: string]: number;
}

export interface STTRun {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  type: string;
  language_id: number | null;
  models: string[] | null;
  status: string;
  total_items: number;
  score: STTScore | null;
  error_message: string | null;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

export interface STTSampleMetadata {
  original_filename?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface STTSample {
  id: number;
  text: string;
  ground_truth: string;
  language_id: number;
  file_id?: string;
  signed_url?: string;
  sample_metadata?: STTSampleMetadata;
}

export interface STTResultRaw {
  id: number;
  transcription: string | null;
  provider: string;
  status: string;
  score: STTScore | null;
  is_correct: boolean | null;
  comment: string | null;
  error_message: string | null;
  stt_sample_id: number;
  evaluation_run_id: number;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
  sample?: STTSample;
}

export interface STTResult extends STTResultRaw {
  sampleName?: string;
  groundTruth?: string;
  fileId?: string;
  signedUrl?: string;
}

export interface Language {
  id: number;
  code: string;
  name: string;
}

export const DEFAULT_LANGUAGES: Language[] = [
  { id: 1, code: "en", name: "English" },
  { id: 2, code: "hi", name: "Hindi" },
];

export interface RawLanguage {
  id: number;
  locale?: string;
  code?: string;
  label?: string;
  name?: string;
  is_active?: boolean;
}

export interface LanguagesResponse {
  data?: { data?: RawLanguage[] } | RawLanguage[];
  languages?: RawLanguage[];
}

export interface DatasetsResponse {
  datasets?: Dataset[];
  data?: Dataset[];
}

export interface RunsResponse {
  runs?: STTRun[];
  data?: STTRun[];
}

export interface RunDetailResponse {
  results?: STTResultRaw[];
  data?: STTResultRaw[] | { results?: STTResultRaw[] };
}

export interface CreateDatasetResponse {
  id: number;
  name: string;
}

export interface CreateRunResponse {
  id: number;
  run_name: string;
}

export interface STTViewDatasetModalData {
  name: string;
  datasetId: number;
  samples: STTSample[];
}
