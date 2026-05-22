"use client";

import { Button, Field } from "@/app/components/ui";
import { ChevronRightIcon, CloseIcon } from "@/app/components/icons";
import { Document } from "@/app/lib/types/document";
import DocumentChip from "./DocumentChip";

interface CreateCollectionFormProps {
  collectionName: string;
  setCollectionName: (value: string) => void;
  collectionDescription: string;
  setCollectionDescription: (value: string) => void;
  selectedDocuments: Set<string>;
  availableDocuments: Document[];
  isLoadingDocuments?: boolean;
  onToggleDocument: (documentId: string) => void;
  onOpenDocumentPicker: () => void;
  isCreating: boolean;
  onCancel: () => void;
  onCreate: () => void;
  onClose?: () => void;
}

export default function CreateCollectionForm({
  collectionName,
  setCollectionName,
  collectionDescription,
  setCollectionDescription,
  selectedDocuments,
  availableDocuments,
  isLoadingDocuments = false,
  onToggleDocument,
  onOpenDocumentPicker,
  isCreating,
  onCancel,
  onCreate,
  onClose,
}: CreateCollectionFormProps) {
  const isCreateDisabled =
    isCreating || !collectionName.trim() || selectedDocuments.size === 0;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            Create Knowledge Base
          </h2>
          <p className="text-xs mt-0.5 text-text-secondary">
            Group documents into a collection for RAG retrieval
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-1 rounded-md text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <Field
        label="Name *"
        value={collectionName}
        onChange={setCollectionName}
        placeholder="e.g., Product Docs v1"
      />

      <div>
        <label className="block text-xs font-medium mb-1 text-text-secondary">
          Description (Optional)
        </label>
        <textarea
          value={collectionDescription}
          onChange={(e) => setCollectionDescription(e.target.value)}
          placeholder="Description..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-text-primary text-sm placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-accent-primary/20 focus:border-accent-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Select Documents *
        </label>
        <button
          type="button"
          onClick={onOpenDocumentPicker}
          disabled={isLoadingDocuments}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-text-primary text-left flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-70"
        >
          {isLoadingDocuments ? (
            <span className="text-sm inline-flex items-center gap-2 text-text-secondary">
              <span className="w-3.5 h-3.5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Loading documents…
            </span>
          ) : (
            <span className="text-sm">
              {selectedDocuments.size === 0
                ? "Click to select documents"
                : `${selectedDocuments.size} document${selectedDocuments.size > 1 ? "s" : ""} selected`}
            </span>
          )}
          <ChevronRightIcon className="w-4 h-4 text-text-secondary" />
        </button>

        {selectedDocuments.size > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {Array.from(selectedDocuments).map((docId) => {
              const doc = availableDocuments.find((d) => d.id === docId);
              if (!doc) return null;
              return (
                <DocumentChip
                  key={docId}
                  fileName={doc.fname}
                  onRemove={() => onToggleDocument(docId)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onCreate}
          disabled={isCreateDisabled}
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Knowledge Base"
          )}
        </Button>
      </div>
    </div>
  );
}
