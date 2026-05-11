"use client";

import { Modal } from "@/app/components";
import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documents: Document[];
  previewDoc: Document | null;
  onSelectDocument: (doc: Document) => void;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documents,
  previewDoc,
  onSelectDocument,
}: DocumentPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Document Preview"
      maxWidth="max-w-5xl"
      maxHeight="h-[80vh]"
    >
      <div className="flex flex-1 min-h-0 h-full">
        <div className="w-56 shrink-0 border-r border-border overflow-y-auto">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className={`w-full text-left px-4 py-3 border-b border-border transition-colors cursor-pointer ${
                previewDoc?.id === doc.id
                  ? "bg-neutral-100"
                  : "hover:bg-neutral-50"
              }`}
            >
              <p className="text-sm text-text-primary truncate">{doc.fname}</p>
              {doc.inserted_at && (
                <p className="text-xs text-text-secondary mt-0.5">
                  {formatDate(doc.inserted_at)}
                </p>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 bg-neutral-50">
          {previewDoc?.signed_url ? (
            <iframe
              key={previewDoc.id}
              src={previewDoc.signed_url}
              title={previewDoc.fname}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-text-secondary">
                {previewDoc
                  ? "No preview available for this document"
                  : "Select a document to preview"}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
