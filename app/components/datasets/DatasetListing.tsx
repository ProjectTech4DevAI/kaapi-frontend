"use client";

import { Button } from "@/app/components/ui";
import { DocumentFileIcon, PlusIcon, InfoIcon } from "@/app/components/icons";
import { Dataset } from "@/app/lib/types/dataset";
import DatasetCard from "./DatasetCard";
import DatasetListingSkeleton from "./DatasetListingSkeleton";

interface DatasetListingProps {
  datasets: Dataset[];
  onDelete: (datasetId: number) => void;
  onUploadNew: () => void;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export default function DatasetListing({
  datasets,
  onDelete,
  onUploadNew,
  isLoading,
  error,
  isAuthenticated,
  totalPages,
  currentPage,
  onPageChange,
}: DatasetListingProps) {
  return (
    <>
      <div className="rounded-lg p-6 bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-text-primary">
            Your Datasets
          </h2>
          <Button variant="primary" size="sm" onClick={onUploadNew}>
            <PlusIcon className="w-4 h-4" />
            Upload New Dataset
          </Button>
        </div>

        {isLoading && datasets.length === 0 ? (
          <DatasetListingSkeleton />
        ) : !isAuthenticated ? (
          <div className="text-center py-12 text-text-secondary">
            <p className="font-medium mb-2 text-text-primary">Login required</p>
            <p className="text-sm">Please log in to manage datasets</p>
          </div>
        ) : error ? (
          <div className="rounded-lg p-6 bg-status-error-bg border border-status-error-border">
            <p className="text-sm font-medium text-status-error-text">
              Error: {error}
            </p>
          </div>
        ) : datasets.length === 0 ? (
          <EmptyState onUploadNew={onUploadNew} />
        ) : (
          <div className="space-y-3">
            {datasets.map((dataset) => (
              <DatasetCard
                key={dataset.dataset_id}
                dataset={dataset}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {!isLoading &&
          !error &&
          isAuthenticated &&
          datasets.length > 0 &&
          totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
      </div>

      <div className="rounded-lg p-5 bg-accent-primary/5 border border-accent-primary/20">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 shrink-0 mt-0.5 text-accent-primary" />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              Storage Note
            </p>
            <p className="text-sm mt-1 text-text-secondary">
              Datasets are stored on the server and synced with Langfuse for
              evaluation tracking.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ onUploadNew }: { onUploadNew: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-primary/10">
        <DocumentFileIcon className="w-7 h-7 text-accent-primary" />
      </div>
      <p className="text-base font-semibold text-text-primary mb-1">
        No datasets found
      </p>
      <p className="text-sm text-text-secondary mb-5">
        Upload your first CSV dataset to get started with evaluations.
      </p>
      <Button variant="primary" size="md" onClick={onUploadNew}>
        <PlusIcon className="w-4 h-4" />
        Upload Your First Dataset
      </Button>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
      <p className="text-sm text-text-secondary">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
