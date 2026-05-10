"use client";

import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";
import { useAuth } from "@/app/lib/context/AuthContext";
import { DocumentFileIcon, TrashIcon } from "@/app/components/icons";
import { Button } from "@/app/components";
import Loader from "@/app/components/Loader";
import FileExtBadge from "@/app/components/FileExtBadge";
import DocumentListingSkeleton from "./DocumentListingSkeleton";

interface DocumentListingProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelect: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onUploadNew: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function DocumentListing({
  documents,
  selectedDocument,
  onSelect,
  onDelete,
  onUploadNew,
  isLoading,
  isLoadingMore,
  error,
  scrollRef,
}: DocumentListingProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="h-full flex flex-col bg-bg-primary">
      <div className="px-6 py-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={onUploadNew}>
          + Upload
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && documents.length === 0 ? (
          <DocumentListingSkeleton />
        ) : !isAuthenticated ? (
          <div className="text-center py-12 text-text-secondary">
            <p className="font-medium mb-2 text-text-primary">Login required</p>
            <p className="text-sm">Please log in to manage documents</p>
          </div>
        ) : error ? (
          <div className="border rounded-lg p-6 bg-status-error-bg border-status-error-border">
            <p className="text-sm font-medium text-status-error-text">
              Error: {error}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-primary/10">
              <DocumentFileIcon className="w-6 h-6 text-accent-primary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              No documents found
            </p>
            <p className="text-xs text-text-secondary mb-4">
              Upload your first document to get started.
            </p>
            <Button variant="primary" size="sm" onClick={onUploadNew}>
              Upload Your First Document
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {documents.map((doc) => {
              const isSelected = selectedDocument?.id === doc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelect(doc)}
                  className={`w-full text-left rounded-lg p-3 transition-shadow cursor-pointer ${
                    isSelected
                      ? "bg-accent-primary/5 shadow-[0_2px_6px_rgba(31,68,150,0.12),0_1px_2px_rgba(0,0,0,0.04)]"
                      : "bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <FileExtBadge fileName={doc.fname} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm truncate ${
                          isSelected
                            ? "font-semibold text-accent-primary"
                            : "font-medium text-text-primary"
                        }`}
                      >
                        {doc.fname}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(doc.inserted_at)}
                      </p>
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                      className="p-1.5 rounded-md border border-status-error-border bg-bg-primary text-status-error-text hover:bg-status-error-bg transition-colors shrink-0 cursor-pointer"
                      title="Delete Document"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {isLoadingMore && (
          <div className="py-4">
            <Loader size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}
