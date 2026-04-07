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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(0,0%,98%)]">
        <div className="text-center text-[hsl(330,3%,49%)]">
          <RefreshIcon className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(0,0%,98%)]">
        <div className="text-center text-[hsl(330,3%,49%)]">
          <DocumentFileIcon className="mx-auto h-16 w-16 mb-4" />
          <p className="text-lg font-medium text-[hsl(330,3%,19%)]">
            No document selected
          </p>
          <p className="text-sm mt-2">
            Select a document from the list to preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-[hsl(0,0%,98%)]">
      <div className="max-w-4xl mx-auto">
        <div className="border rounded-lg p-6 mb-6 bg-[hsl(0,0%,100%)] border-[hsl(0,0%,85%)]">
          <h2 className="text-lg font-semibold mb-4 text-[hsl(330,3%,19%)]">
            {document.fname}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330,3%,49%)]">
                File Type
              </div>
              <div className="text-sm font-medium text-[hsl(330,3%,19%)]">
                {getFileExtension(document.fname).toUpperCase() || "Unknown"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330,3%,49%)]">
                File Size
              </div>
              <div className="text-sm font-medium text-[hsl(330,3%,19%)]">
                {document.file_size
                  ? document.file_size < 1024 * 1024
                    ? `${Math.round(document.file_size / 1024)} KB`
                    : `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`
                  : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1 text-[hsl(330,3%,49%)]">
                Uploaded at
              </div>
              <div className="text-sm font-medium text-[hsl(330,3%,19%)]">
                {formatDate(document.inserted_at)}
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 min-h-[600px] bg-[hsl(0,0%,100%)] border-[hsl(0,0%,85%)]">
          <h3 className="text-lg font-semibold mb-4 text-[hsl(330,3%,19%)]">
            Preview
          </h3>

          {!document.signed_url && document.object_store_url && (
            <div className="mb-4 p-3 rounded-lg border bg-[hsl(48,100%,95%)] border-[hsl(48,100%,80%)]">
              <p className="text-xs text-[hsl(48,100%,30%)]">
                Direct preview unavailable. The backend is not generating signed
                URLs. Please download the file to view it.
              </p>
            </div>
          )}

          {document.signed_url ? (
            <>
              {getMimeType(document.fname).startsWith("image/") ? (
                imageLoadError ? (
                  <div className="text-center p-8">
                    <p className="text-[hsl(330,3%,49%)]">
                      Failed to load image preview. Check console for details.
                    </p>
                  </div>
                ) : (
                  <img
                    src={document.signed_url}
                    alt={document.fname}
                    className="max-w-full h-auto rounded"
                    onError={() => {
                      setImageLoadError(true);
                    }}
                  />
                )
              ) : getMimeType(document.fname) === "application/pdf" ? (
                <iframe
                  src={document.signed_url}
                  className="w-full h-[700px] rounded border border-[hsl(0,0%,85%)]"
                  title={document.fname}
                />
              ) : getMimeType(document.fname).startsWith("text/") ? (
                <div className="border rounded p-4 min-h-[400px] bg-[hsl(0,0%,98%)] border-[hsl(0,0%,85%)] text-[hsl(330,3%,19%)]">
                  <p className="text-sm mb-2 text-[hsl(330,3%,49%)]">
                    Text file preview:
                  </p>
                  <iframe
                    src={document.signed_url}
                    className="w-full h-[500px] rounded border border-[hsl(0,0%,85%)] bg-white"
                    title={document.fname}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-[hsl(330,3%,49%)]">
                  <div className="text-center">
                    <DocumentTextIcon className="mx-auto mb-4" />
                    <p className="mb-2">
                      Preview not available for this file type
                    </p>
                    <p className="text-xs mb-4">
                      Supported types: Images, PDFs, Text files
                    </p>
                    <p className="text-xs mb-4 text-[hsl(330,3%,70%)]">
                      File type: {getMimeType(document.fname)}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[400px] text-[hsl(330,3%,49%)]">
              <div className="text-center">
                <WarningIcon className="mx-auto mb-4" />
                <p className="mb-2">No preview available</p>
                <p className="text-xs mb-4">
                  Signed URL not generated by backend
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            {(document.signed_url || document.object_store_url) && (
              <a
                href={document.signed_url || document.object_store_url}
                download={document.fname}
                className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white hover:bg-accent-hover"
              >
                Download {document.fname}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
