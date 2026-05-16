"use client";

import { useState, useMemo } from "react";
import { Button, Modal } from "@/app/components/ui";
import { CheckLineIcon, SearchIcon } from "@/app/components/icons";
import { Document } from "@/app/lib/types/document";

interface DocumentPickerModalProps {
  open: boolean;
  onClose: () => void;
  availableDocuments: Document[];
  selectedDocuments: Set<string>;
  onToggleDocument: (documentId: string) => void;
  onClearAll: () => void;
  onDone: () => void;
}

export default function DocumentPickerModal({
  open,
  onClose,
  availableDocuments,
  selectedDocuments,
  onToggleDocument,
  onClearAll,
  onDone,
}: DocumentPickerModalProps) {
  const [search, setSearch] = useState("");

  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableDocuments;
    return availableDocuments.filter((d) => d.fname.toLowerCase().includes(q));
  }, [availableDocuments, search]);

  return (
    <Modal open={open} onClose={onClose} title="Select Documents">
      <div className="p-6">
        {availableDocuments.length > 0 && (
          <div className="relative mb-3 pr-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents by name..."
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-bg-secondary text-text-primary text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:bg-bg-primary transition-colors"
            />
          </div>
        )}

        <div className="mb-4">
          {availableDocuments.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              No documents available. Please upload documents first.
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="p-8 text-center text-sm text-text-secondary">
              No documents match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocuments.has(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-accent-primary/5 border-accent-primary"
                        : "border-border hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleDocument(doc.id)}
                      className="mr-3 w-4 h-4 cursor-pointer accent-accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          isSelected
                            ? "text-accent-primary"
                            : "text-text-primary"
                        }`}
                      >
                        {doc.fname}
                      </p>
                      <p className="text-xs mt-0.5 text-text-secondary">
                        ID: {doc.id.substring(0, 8)}...
                      </p>
                    </div>
                    {isSelected && (
                      <CheckLineIcon className="w-4 h-4 ml-2 shrink-0 text-accent-primary" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-secondary">
              {selectedDocuments.size} document
              {selectedDocuments.size !== 1 ? "s" : ""} selected
            </p>
            {selectedDocuments.size > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-status-error-text hover:underline cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onDone} disabled={selectedDocuments.size === 0}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
