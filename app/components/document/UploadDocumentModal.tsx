"use client";

import { useEffect } from "react";
import { CloseIcon, CloudUploadIcon } from "@/app/components/icons";

export interface UploadDocumentModalProps {
  selectedFile: File | null;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpload: () => void;
  onClose: () => void;
}

export function UploadDocumentModal({
  selectedFile,
  isUploading,
  onFileSelect,
  onUpload,
  onClose,
}: UploadDocumentModalProps) {
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalBackdrop bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modalContent bg-[hsl(0,0%,100%)] border-[hsl(0,0%,85%)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between border-[hsl(0,0%,85%)]">
          <h2 className="text-lg font-semibold text-[hsl(330,3%,19%)]">
            Upload New Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors text-[hsl(330,3%,49%)] hover:bg-[hsl(0,0%,95%)]"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm mb-6 text-[hsl(330,3%,49%)]">
            Upload a document file. Supported formats: pdf, doc, txt and more.
          </p>

          {/* File Selection Area */}
          <div className="border-2 border-dashed rounded-lg p-12 text-center transition-colors border-[hsl(0,0%,85%)]">
            <div className="space-y-4">
              <div className="text-[hsl(330,3%,49%)]">
                <CloudUploadIcon className="mx-auto" />
              </div>
              <div>
                <label
                  htmlFor="document-file-upload"
                  className={`px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium ${
                    isUploading
                      ? "bg-[hsl(0,0%,95%)] text-[hsl(330,3%,49%)] cursor-not-allowed"
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
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                />
              </div>
              {selectedFile && (
                <div className="text-sm text-[hsl(330,3%,49%)]">
                  Selected:{" "}
                  <span className="font-medium text-[hsl(330,3%,19%)]">
                    {selectedFile.name}
                  </span>
                  <span className="ml-2">
                    ({Math.round(selectedFile.size / 1024)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Document Name Field (Read-only) */}
          {selectedFile && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2 text-[hsl(330,3%,19%)]">
                Document Name
              </label>
              <input
                type="text"
                value={selectedFile.name}
                readOnly
                className="w-full px-4 py-2 rounded-md border text-sm border-[hsl(0,0%,85%)] bg-[hsl(0,0%,97%)] text-[hsl(330,3%,49%)] cursor-not-allowed"
              />
              <p className="text-xs mt-1 text-[hsl(330,3%,49%)]">
                The file will be uploaded with this name
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 border-[hsl(0,0%,85%)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-[hsl(0,0%,85%)] bg-[hsl(0,0%,100%)] text-[hsl(330,3%,19%)] hover:bg-[hsl(0,0%,95%)]"
          >
            Cancel
          </button>
          <button
            onClick={onUpload}
            disabled={!selectedFile || isUploading}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              !selectedFile || isUploading
                ? "bg-[hsl(0,0%,95%)] text-[hsl(330,3%,49%)] cursor-not-allowed"
                : "bg-[#171717] text-white cursor-pointer hover:bg-accent-hover"
            }`}
          >
            {isUploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
