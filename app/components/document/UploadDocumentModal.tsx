"use client";

import Modal from "@/app/components/Modal";
import { CloudUploadIcon } from "@/app/components/icons";
import type { UploadPhase } from "@/app/lib/apiClient";
import { ACCEPTED_DOCUMENT_TYPES } from "@/app/lib/constants";

export interface UploadDocumentModalProps {
  open: boolean;
  selectedFile: File | null;
  isUploading: boolean;
  uploadProgress?: number;
  uploadPhase?: UploadPhase;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClose: () => void;
}

export function UploadDocumentModal({
  open,
  selectedFile,
  isUploading,
  uploadProgress = 0,
  uploadPhase = "uploading",
  onFileSelect,
  onUpload,
  onClose,
}: UploadDocumentModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload New Document"
      maxHeight="max-h-[90vh]"
    >
      <div className="p-6">
        <p className="text-sm mb-6 text-text-secondary">
          Upload a document file. Supported formats: pdf, doc, txt and more.
        </p>

        <div className="border-2 border-dashed rounded-lg p-12 text-center transition-colors border-border">
          <div className="space-y-4">
            <div className="text-text-secondary">
              <CloudUploadIcon className="mx-auto" />
            </div>
            <div>
              <label
                htmlFor="document-file-upload"
                className={`px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium ${
                  isUploading
                    ? "bg-neutral-100 text-text-secondary cursor-not-allowed"
                    : "bg-[#171717] text-white cursor-pointer"
                }`}
              >
                Choose File
              </label>
              <input
                id="document-file-upload"
                type="file"
                onChange={onFileSelect}
                disabled={isUploading}
                className="hidden"
                accept={ACCEPTED_DOCUMENT_TYPES}
              />
            </div>
            {selectedFile && (
              <div className="text-sm text-text-secondary">
                Selected:{" "}
                <span className="font-medium text-text-primary">
                  {selectedFile.name}
                </span>
                <span className="ml-2">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedFile && (
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2 text-text-primary">
              Document Name
            </label>
            <input
              type="text"
              value={selectedFile.name}
              readOnly
              className="w-full px-4 py-2 rounded-md border text-sm border-border bg-neutral-50 text-text-secondary cursor-not-allowed"
            />
            <p className="text-xs mt-1 text-text-secondary">
              The file will be uploaded with this name
            </p>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between text-xs mb-1.5 text-text-secondary">
            <span>
              {uploadPhase === "processing"
                ? "Processing document..."
                : "Uploading..."}
            </span>
            {uploadPhase === "uploading" && <span>{uploadProgress}%</span>}
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200">
            {uploadPhase === "processing" ? (
              <div className="h-full rounded-full bg-[#171717] animate-pulse w-full" />
            ) : (
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-[#171717]"
                style={{ width: `${uploadProgress}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div className="border-t px-6 py-4 flex items-center justify-end gap-3 border-border shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-border bg-white text-text-primary hover:bg-neutral-100"
        >
          Cancel
        </button>
        <button
          onClick={onUpload}
          disabled={!selectedFile || isUploading}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            !selectedFile || isUploading
              ? "bg-neutral-100 text-text-secondary cursor-not-allowed"
              : "bg-[#171717] text-white cursor-pointer hover:bg-accent-hover"
          }`}
        >
          {isUploading
            ? uploadPhase === "processing"
              ? "Processing..."
              : `Uploading... ${uploadProgress}%`
            : "Upload Document"}
        </button>
      </div>
    </Modal>
  );
}
