"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/app/components";
import Loader from "@/app/components/Loader";
import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  previewDoc: Document | null;
  isLoading?: boolean;
  onSelectDocument: (doc: Document) => void;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documents,
  previewDoc,
  isLoading,
  onSelectDocument,
}: DocumentPreviewModalProps) {
  const [isFrameLoading, setIsFrameLoading] = useState(false);

  useEffect(() => {
    if (!previewDoc?.signed_url) return;
    setIsFrameLoading(true);
    // Fallback: iframe `onLoad` doesn't fire reliably when the browser
    const timer = setTimeout(() => setIsFrameLoading(false), 6000);
    return () => clearTimeout(timer);
  }, [previewDoc?.id, previewDoc?.signed_url]);

  const showLoader = isLoading || isFrameLoading;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Document Preview"
      maxWidth="max-w-5xl"
      maxHeight="h-[80vh]"
    >
      <div className="flex flex-1 min-h-0 h-full">
        <div className="w-56 shrink-0 border-r border-border overflow-y-auto bg-bg-secondary">
          {documents.map((doc) => {
            const isSelected = previewDoc?.id === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`relative w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-accent-primary/5"
                    : "hover:bg-accent-primary/5"
                }`}
              >
                {isSelected && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-primary" />
                )}
                <p
                  className={`text-sm truncate ${
                    isSelected
                      ? "font-semibold text-accent-primary"
                      : "font-medium text-text-primary"
                  }`}
                >
                  {doc.fname}
                </p>
                {doc.inserted_at && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {formatDate(doc.inserted_at)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 bg-neutral-50 relative">
          {previewDoc?.signed_url ? (
            <iframe
              key={previewDoc.id}
              src={previewDoc.signed_url}
              title={previewDoc.fname}
              onLoad={() => setIsFrameLoading(false)}
              className="w-full h-full border-none"
            />
          ) : !showLoader ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-text-secondary">
                {previewDoc
                  ? "No preview available for this document"
                  : "Select a document to preview"}
              </p>
            </div>
          ) : null}

          {showLoader && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/80 backdrop-blur-[1px] pointer-events-none">
              <Loader
                size="md"
                message={
                  previewDoc?.fname
                    ? `Loading ${previewDoc.fname}…`
                    : "Loading document…"
                }
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
