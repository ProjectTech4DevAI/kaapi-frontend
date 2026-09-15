// Uploaded submission file. Separate from the shared `Dataset`, which stays
import type { ValueSetter } from "./core";
import type { DatasetViewModalData } from "./dataset";
import type { ChangeEvent, DragEvent } from "react";
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

export interface UseSubmissionFormResult {
  name: string;
  description: string;
  file: File | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setIsDragging: (value: boolean) => void;
  removeFile: () => void;
  reset: () => void;
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLElement>) => void;
}

export interface UseSubmissionStepResult {
  form: UseSubmissionFormResult;
  submissions: AssessmentSubmission[];
  selectedId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  isCreating: boolean;
  viewingId: string | null;
  deletingId: string | null;
  viewModalData: DatasetViewModalData | null;
  confirmDeleteId: string | null;
  pendingDelete: AssessmentSubmission | undefined;
  setConfirmDeleteId: (value: string | null) => void;
  setViewModalData: (value: DatasetViewModalData | null) => void;
  handleCreate: () => Promise<void>;
  handleSelect: (id: string, name?: string) => Promise<void>;
  handleView: (submissionId: string, name: string) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

export interface SubmissionListProps {
  submissions: AssessmentSubmission[];
  selectedId: string;
  isLoading: boolean;
  isLoadingColumns: boolean;
  viewingId: string | null;
  onSelect: (id: string, name?: string) => void;
  onView: (submissionId: string, name: string) => void;
  onRequestDelete: ValueSetter<string>;
}

export interface CreatePanelProps {
  form: UseSubmissionFormResult;
  isCreating: boolean;
  onCreate: () => void;
  /** Step 1 shows it as the right-hand pane; step 4 embeds it inline. */
  layout?: "panel" | "inline";
  /** Runs after Cancel clears the form — step 4 also collapses the panel. */
  onCancel?: () => void;
}
