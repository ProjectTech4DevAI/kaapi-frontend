"use client";

import { useState, useEffect } from "react";
import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";
import {
  RefreshIcon,
  DocumentFileIcon,
  DocumentTextIcon,
  WarningIcon,
} from "@/app/components/icons";

interface DocumentPreviewProps {
  document: Document | null;
  isLoading: boolean;
}

export function DocumentPreview({ document, isLoading }: DocumentPreviewProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    setImageLoadError(false);
  }, [document?.id]);

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  };

  const getMimeType = (filename: string) => {
    const ext = getFileExtension(filename);
    const mimeTypes: { [key: string]: string } = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      txt: "text/plain",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    return mimeTypes[ext] || "application/octet-stream";
  };

  const formatFileSize = (size?: number) => {
    if (!size) return "N/A";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isPreviewable = (filename: string) => {
    const mime = getMimeType(filename);
    return mime.startsWith("image/") || mime === "application/pdf";
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-50">
        <div className="text-center text-text-secondary">
          <RefreshIcon className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-50">
        <div className="text-center text-text-secondary">
          <DocumentFileIcon className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm font-medium text-text-primary">
            No document selected
          </p>
          <p className="text-xs mt-1">
            Select a document from the list to preview
          </p>
        </div>
      </div>
    );
  }

  const ext = getFileExtension(document.fname);
  const mimeType = getMimeType(document.fname);

  return (
    <div className="h-full overflow-y-auto bg-neutral-50">
      <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <DocumentFileIcon className="w-5 h-5 shrink-0 text-text-secondary" />
              <h2 className="text-base font-semibold text-text-primary truncate">
                {document.fname}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              {ext && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-neutral-100 font-medium text-text-primary uppercase">
                  {ext}
                </span>
              )}
              <span>{formatFileSize(document.file_size)}</span>
              <span>{formatDate(document.inserted_at)}</span>
            </div>
          </div>
          {(document.signed_url || document.object_store_url) &&
            (isPreviewable(document.fname) ? (
              <a
                href={document.signed_url || document.object_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white hover:bg-accent-hover"
              >
                Download
              </a>
            ) : (
              <a
                href={document.signed_url || document.object_store_url}
                download={document.fname}
                className="shrink-0 px-4 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white hover:bg-accent-hover"
              >
                Download
              </a>
            ))}
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {!document.signed_url && document.object_store_url && (
            <div className="mb-4 px-4 py-3 rounded-lg border bg-amber-50 border-amber-200">
              <p className="text-xs text-amber-700">
                Direct preview unavailable. Please download the file to view it.
              </p>
            </div>
          )}

          {document.signed_url ? (
            <div className="rounded-lg border border-border bg-white overflow-hidden">
              {mimeType.startsWith("image/") ? (
                imageLoadError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                    <WarningIcon className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Failed to load image preview</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 bg-[repeating-conic-gradient(hsl(0,0%,92%)_0%_25%,transparent_0%_50%)] bg-size-[16px_16px]">
                    <img
                      src={document.signed_url}
                      alt={document.fname}
                      className="max-w-full h-auto rounded shadow-sm"
                      onError={() => setImageLoadError(true)}
                    />
                  </div>
                )
              ) : mimeType === "application/pdf" ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[700px]"
                  title={document.fname}
                />
              ) : mimeType.startsWith("text/") ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[500px] bg-white"
                  title={document.fname}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                  <DocumentTextIcon className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-text-primary mb-1">
                    Preview not available
                  </p>
                  <p className="text-xs">
                    This file type ({ext.toUpperCase()}) cannot be previewed.
                    Download to view.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-white">
              <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                <WarningIcon className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-text-primary mb-1">
                  No preview available
                </p>
                <p className="text-xs">Signed URL not generated by backend</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
