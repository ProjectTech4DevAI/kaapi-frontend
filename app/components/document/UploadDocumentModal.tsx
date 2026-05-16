"use client";

import { useRef } from "react";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import { CloudUploadIcon } from "@/app/components/icons";
import DocumentChip from "@/app/components/knowledge-base/DocumentChip";
import type { UploadPhase } from "@/app/lib/apiClient";
import {
  ACCEPTED_DOCUMENT_TYPES,
  MAX_DOCUMENT_SIZE_MB,
  MAX_DOCUMENT_UPLOAD_BATCH,
} from "@/app/lib/constants";

export interface UploadDocumentModalProps {
  open: boolean;
  selectedFiles: File[];
  isUploading: boolean;
  uploadProgress?: number;
  uploadPhase?: UploadPhase;
  currentUploadIndex?: number;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onClearFiles: () => void;
  onUpload: () => void;
  onClose: () => void;
}

export function UploadDocumentModal({
  open,
  selectedFiles,
  isUploading,
  uploadProgress = 0,
  uploadPhase = "uploading",
  currentUploadIndex = 0,
  onFileSelect,
  onRemoveFile,
  onClearFiles,
  onUpload,
  onClose,
}: UploadDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_DOCUMENT_UPLOAD_BATCH - selectedFiles.length;
  const limitReached = remaining <= 0;
  const totalFiles = selectedFiles.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload New Document"
      maxHeight="max-h-[90vh]"
    >
      <div className="p-6">
        <p className="text-sm mb-4 text-text-secondary">
          Upload up to {MAX_DOCUMENT_UPLOAD_BATCH} documents. Supported formats:
          pdf, doc, txt and more.
        </p>

        <div className="text-xs mb-6 px-3 py-2 rounded-md bg-neutral-50 border border-border text-text-secondary">
          <span className="font-medium text-text-primary">Note:</span> Maximum
          file size is {MAX_DOCUMENT_SIZE_MB} MB. Larger files will be rejected.
        </div>

        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-secondary">
                Selected files ({selectedFiles.length}/
                {MAX_DOCUMENT_UPLOAD_BATCH})
              </label>
              {!isUploading && (
                <button
                  type="button"
                  onClick={onClearFiles}
                  className="text-xs font-medium text-status-error-text hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {selectedFiles.map((file, index) => (
                <DocumentChip
                  key={`${file.name}-${index}`}
                  fileName={file.name}
                  onRemove={isUploading ? undefined : () => onRemoveFile(index)}
                />
              ))}
            </div>
          </div>
        )}

        {!limitReached && !isUploading && (
          <div className="border-2 border-dashed rounded-lg p-10 text-center transition-colors border-border">
            <div className="space-y-4">
              <div className="text-text-secondary">
                <CloudUploadIcon className="mx-auto" />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  id="document-file-upload"
                  type="file"
                  multiple
                  onChange={onFileSelect}
                  disabled={isUploading || limitReached}
                  className="hidden"
                  accept={ACCEPTED_DOCUMENT_TYPES}
                />
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || limitReached}
                >
                  Choose File{remaining > 1 ? "s" : ""}
                </Button>
                <p className="text-xs mt-3 text-text-secondary">
                  {remaining} more file{remaining !== 1 ? "s" : ""} can be added
                </p>
              </div>
            </div>
          </div>
        )}

        {limitReached && !isUploading && (
          <div className="rounded-lg p-4 text-center text-xs bg-status-warning-bg border border-status-warning-border text-status-warning-text">
            Maximum of {MAX_DOCUMENT_UPLOAD_BATCH} files reached. Remove a file
            to add a different one.
          </div>
        )}
      </div>

      {isUploading && (
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between text-xs mb-1.5 text-text-secondary">
            <span>
              {uploadPhase === "processing"
                ? `Processing ${selectedFiles[currentUploadIndex]?.name ?? "document"}...`
                : `Uploading ${currentUploadIndex + 1} of ${totalFiles}: ${selectedFiles[currentUploadIndex]?.name ?? ""}`}
            </span>
            {uploadPhase === "uploading" && <span>{uploadProgress}%</span>}
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200">
            {uploadPhase === "processing" ? (
              <div className="h-full rounded-full bg-accent-primary animate-pulse w-full" />
            ) : (
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-accent-primary"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </div>
        </div>
      )}

      <div className="border-t px-6 py-4 flex items-center justify-end gap-3 border-border shrink-0">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onUpload}
          disabled={selectedFiles.length === 0 || isUploading}
        >
          {isUploading
            ? uploadPhase === "processing"
              ? "Processing..."
              : `Uploading ${currentUploadIndex + 1}/${totalFiles}...`
            : selectedFiles.length > 1
              ? `Upload ${selectedFiles.length} Documents`
              : "Upload Document"}
        </Button>
      </div>
    </Modal>
  );
}
