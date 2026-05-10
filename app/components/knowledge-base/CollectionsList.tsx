"use client";

import { Button } from "@/app/components";
import { BookOpenIcon, TrashIcon } from "@/app/components/icons";
import { formatDate } from "@/app/components/utils";
import { Collection } from "@/app/lib/types/document";
import CollectionsListSkeleton from "./CollectionsListSkeleton";

interface CollectionsListProps {
  collections: Collection[];
  selectedCollection: Collection | null;
  isLoading: boolean;
  onSelect: (collectionId: string) => void;
  onRequestDelete: (collectionId: string) => void;
  onCreateNew: () => void;
}

export default function CollectionsList({
  collections,
  selectedCollection,
  isLoading,
  onSelect,
  onRequestDelete,
  onCreateNew,
}: CollectionsListProps) {
  return (
    <div className="w-full lg:w-1/3 lg:border-r border-border flex flex-col">
      <div className="px-6 py-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={onCreateNew}>
          + Create
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading && collections.length === 0 ? (
          <CollectionsListSkeleton />
        ) : collections.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-primary/10">
              <BookOpenIcon className="w-6 h-6 text-accent-primary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              No knowledge bases yet
            </p>
            <p className="text-xs text-text-secondary">
              Click <span className="font-medium">+ Create</span> to add your
              first one.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {collections.map((collection) => {
              const isSelected = selectedCollection?.id === collection.id;
              const isOptimistic = collection.id.startsWith("optimistic-");
              return (
                <button
                  key={collection.id}
                  onClick={() => onSelect(collection.id)}
                  className={`w-full text-left rounded-lg p-3 transition-shadow cursor-pointer ${
                    isSelected
                      ? "bg-accent-primary/5 shadow-[0_2px_6px_rgba(31,68,150,0.12),0_1px_2px_rgba(0,0,0,0.04)]"
                      : "bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-accent-primary">
                      <BookOpenIcon className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`text-sm truncate ${
                          isSelected
                            ? "font-semibold text-accent-primary"
                            : "font-medium text-text-primary"
                        }`}
                      >
                        {collection.name}
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatDate(collection.inserted_at)}
                      </p>
                    </div>
                    {!isOptimistic && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onRequestDelete(collection.id);
                        }}
                        className="p-1.5 rounded-md border border-status-error-border bg-bg-primary text-status-error-text hover:bg-status-error-bg transition-colors shrink-0 cursor-pointer"
                        title="Delete Knowledge Base"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
