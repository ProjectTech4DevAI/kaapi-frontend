"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";
import {
  DocumentFileIcon,
  DocumentTextIcon,
  DownloadIcon,
  WarningIcon,
} from "@/app/components/icons";
import FileExtBadge from "@/app/components/FileExtBadge";
import DocumentPreviewSkeleton from "./DocumentPreviewSkeleton";

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
    return <DocumentPreviewSkeleton />;
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center px-6 bg-neutral-50">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
            <DocumentFileIcon className="w-7 h-7 text-accent-primary" />
          </div>
          <p className="text-base font-semibold text-text-primary mb-1">
            No document selected
          </p>
          <p className="text-sm text-text-secondary">
            Pick a document from the list to preview it here, or upload a new
            one to get started.
          </p>
        </div>
      </div>
    );
  }

  const ext = getFileExtension(document.fname);
  const mimeType = getMimeType(document.fname);

  return (
    <div className="h-full overflow-y-auto bg-neutral-50">
      <div className="sticky top-0 z-10 bg-bg-primary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2">
              <FileExtBadge fileName={document.fname} size="sm" />
              <h2 className="text-base font-semibold text-text-primary truncate">
                {document.fname}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>Size: {formatFileSize(document.file_size)}</span>
              <span>Uploaded: {formatDate(document.inserted_at)}</span>
            </div>
          </div>
          {(document.signed_url || document.object_store_url) && (
            <a
              href={document.signed_url || document.object_store_url}
              {...(isPreviewable(document.fname)
                ? {}
                : { download: document.fname })}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium transition-colors bg-accent-primary text-white hover:bg-accent-hover rounded-full"
            >
              <DownloadIcon className="w-4 h-4" />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {!document.signed_url && document.object_store_url && (
            <div className="mb-4 px-4 py-3 rounded-lg border bg-status-warning-bg border-status-warning-border">
              <p className="text-xs text-status-warning-text">
                Direct preview unavailable. Please download the file to view it.
              </p>
            </div>
          )}

          {document.signed_url ? (
            <div className="rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              {mimeType.startsWith("image/") ? (
                imageLoadError ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                    <WarningIcon className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Failed to load image preview</p>
                  </div>
                ) : (
                  <Image
                    src={document.signed_url}
                    alt={document.fname}
                    width={800}
                    height={600}
                    className="max-w-full h-auto rounded"
                    unoptimized
                    onError={() => {
                      setImageLoadError(true);
                    }}
                  />
                )
              ) : mimeType === "application/pdf" ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[700px]"
                  title={document.fname}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
                  <DocumentTextIcon className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium text-text-primary mb-1">
                    Preview is not available for .{ext} files
                  </p>
                  <p className="text-xs mb-4">
                    This file type cannot be rendered in the browser.
                  </p>
                  <a
                    href={document.signed_url}
                    download={document.fname}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors bg-accent-primary text-white hover:bg-accent-hover"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Download to view
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
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
