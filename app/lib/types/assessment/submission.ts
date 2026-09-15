// Uploaded submission file. Separate from the shared `Dataset`, which stays
// on numeric ids for evaluations, STT and TTS.

export interface AssessmentSubmission {
  submission_id: string;
  name: string;
  description?: string | null;
  total_items: number;
  object_store_url?: string | null;
  signed_url?: string | null;
  preview?: SubmissionPreviewRows | null;
}

export interface SubmissionPreviewRows {
  headers?: string[];
  rows?: string[][];
  returned_rows?: number;
  truncated?: boolean;
}

export interface SubmissionPreviewPayload {
  total_items?: number;
  preview?: SubmissionPreviewRows;
}

/** Normalized preview the wizard renders. */
export interface SubmissionPreview {
  headers: string[];
  rows: string[][];
  totalItems: number;
  truncated: boolean;
}

export interface CreateSubmissionInput {
  name: string;
  description?: string;
  file: File;
}
