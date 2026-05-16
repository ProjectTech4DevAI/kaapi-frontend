"use client";

import { useState } from "react";
import { Button } from "@/app/components";
import {
  CheckLineIcon,
  ChevronDownIcon,
  CopyIcon,
} from "@/app/components/icons";
import { formatDate } from "@/app/components/utils";
import { Collection, Document } from "@/app/lib/types/document";

interface CollectionDetailProps {
  collection: Collection;
  onRequestDelete: (collectionId: string) => void;
  onPreviewDocument: (firstDocument: Document) => void;
}

export default function CollectionDetail({
  collection,
  onRequestDelete,
  onPreviewDocument,
}: CollectionDetailProps) {
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const isOptimistic = collection.id.startsWith("optimistic-");
  const documents = collection.documents ?? [];
  const visibleDocs = showAllDocs ? documents : documents.slice(0, 3);
  const knowledgeBaseId = collection.knowledge_base_id || "";

  const handleCopy = async () => {
    if (!knowledgeBaseId) return;
    try {
      await navigator.clipboard.writeText(knowledgeBaseId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary">
              {collection.name}
            </h2>
            {collection.description && (
              <p className="text-sm mt-1 text-text-secondary">
                {collection.description}
              </p>
            )}
          </div>
          {!isOptimistic && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onRequestDelete(collection.id)}
            >
              Delete
            </Button>
          )}
        </div>

        <div className="space-y-3 mt-6">
          <DetailRow
            label="Status"
            value={(collection.status || "N/A")
              .replace(/_/g, " ")
              .toUpperCase()}
          />
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase font-semibold text-text-secondary">
              Knowledge Base ID:
            </div>
            {knowledgeBaseId ? (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border bg-bg-secondary">
                <code className="text-sm font-mono text-text-primary">
                  {knowledgeBaseId}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
                  aria-label={copied ? "Copied" : "Copy Knowledge Base ID"}
                  title={copied ? "Copied" : "Copy"}
                >
                  {copied ? (
                    <CheckLineIcon className="w-3.5 h-3.5 text-status-success" />
                  ) : (
                    <CopyIcon className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <div className="text-sm font-semibold text-text-primary">N/A</div>
            )}
          </div>
          <DetailRow
            label="Created"
            value={formatDate(collection.inserted_at)}
          />
          <DetailRow
            label="Last Updated"
            value={formatDate(collection.updated_at)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pt-6 pb-4 flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">
            Documents Present ({documents.length})
          </h3>
          {documents.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreviewDocument(documents[0])}
            >
              Preview
            </Button>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border shrink-0">
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase text-text-secondary">
                  Name
                </p>
              </div>
              <div className="shrink-0">
                <p className="text-[10px] font-semibold uppercase text-text-secondary">
                  Uploaded At
                </p>
              </div>
            </div>

            <div
              className={`space-y-2 ${
                showAllDocs ? "flex-1 min-h-0 overflow-y-auto" : ""
              }`}
            >
              {visibleDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm text-text-primary truncate">
                      {doc.fname}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <p className="text-xs text-text-secondary">
                      {doc.inserted_at ? formatDate(doc.inserted_at) : "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {documents.length > 3 && (
              <div className="mt-2 flex justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAllDocs(!showAllDocs)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary hover:text-accent-primary transition-colors cursor-pointer"
                >
                  {showAllDocs
                    ? "Show less"
                    : `Show ${documents.length - 3} more`}
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAllDocs ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-center py-8 text-text-secondary">
            No documents in this collection
          </p>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs uppercase font-semibold text-text-secondary">
        {label}:
      </div>
      <div className="text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
