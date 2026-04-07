"use client";

import { APIKey } from "@/app/lib/types/credentials";
import { formatDate } from "@/app/components/utils";
import { Document } from "@/app/lib/types/document";
import {
  RefreshIcon,
  KeyIcon,
  DocumentFileIcon,
  TrashIcon,
} from "@/app/components/icons";

interface DocumentListingProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelect: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onUploadNew: () => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  apiKey: APIKey | null;
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
  apiKey,
  scrollRef,
}: DocumentListingProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 border-b bg-[hsl(0,0%,100%)] border-[hsl(0,0%,85%)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-[hsl(330,3%,19%)]">
            Your Documents
          </h2>
          <button
            onClick={onUploadNew}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white hover:bg-accent-hover cursor-pointer"
          >
            + Upload
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 bg-[hsl(0,0%,98%)]"
      >
        {isLoading && documents.length === 0 ? (
          <div className="text-center py-12 text-[hsl(330,3%,49%)]">
            <RefreshIcon className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : !apiKey ? (
          <div className="text-center py-12 text-[hsl(330,3%,49%)]">
            <KeyIcon className="mx-auto mb-4" />
            <p className="font-medium mb-2 text-[hsl(330,3%,19%)]">
              No API key found
            </p>
            <p className="text-sm mb-4">
              Please add an API key in the Keystore
            </p>
            <a
              href="/keystore"
              className="inline-block px-6 py-2 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white"
            >
              Go to Keystore
            </a>
          </div>
        ) : error ? (
          <div className="border rounded-lg p-6 bg-[hsl(8,86%,95%)] border-[hsl(8,86%,80%)]">
            <p className="text-sm font-medium text-[hsl(8,86%,40%)]">
              Error: {error}
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-[hsl(330,3%,49%)]">
            <DocumentFileIcon className="mx-auto h-12 w-12 mb-4" />
            <p className="font-medium mb-2 text-[hsl(330,3%,19%)]">
              No documents found
            </p>
            <p className="text-sm mb-4">
              Upload your first document to get started
            </p>
            <button
              onClick={onUploadNew}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors bg-[#171717] text-white hover:bg-accent-hover"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onSelect(doc)}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id
                    ? "bg-[hsl(202,100%,95%)] border-[hsl(202,100%,50%)]"
                    : "bg-[hsl(0,0%,100%)] border-[hsl(0,0%,85%)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <DocumentFileIcon className="w-5 h-5 shrink-0 text-[#171717]" />
                      <h3 className="text-sm font-semibold truncate text-[hsl(330,3%,19%)]">
                        {doc.fname}
                      </h3>
                    </div>
                    <div className="text-xs text-[hsl(330,3%,49%)]">
                      <div>{formatDate(doc.inserted_at)}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(doc.id);
                    }}
                    className="p-1.5 rounded-md transition-colors shrink-0 border border-[hsl(8,86%,80%)] bg-[hsl(0,0%,100%)] text-[hsl(8,86%,40%)] hover:bg-[hsl(8,86%,95%)]"
                    title="Delete Document"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoadingMore && (
          <div className="text-center py-4 text-[hsl(330,3%,49%)]">
            <RefreshIcon className="w-6 h-6 mx-auto animate-spin" />
            <p className="text-xs mt-1">Loading more...</p>
          </div>
        )}
      </div>
    </div>
  );
}
