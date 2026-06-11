"use client";

import { Button, Modal } from "@/app/components/ui";
import { useAssessmentDatasetsTab } from "@/app/hooks/useAssessmentDatasetsTab";
import type { DatasetsTabProps } from "@/app/lib/types/assessment";
import { WarningIcon } from "@/app/components/icons";
import DataViewModal from "@/app/components/assessment/DataViewModal";
import CreatePanel from "@/app/components/assessment/datasets/CreatePanel";
import DatasetList from "@/app/components/assessment/datasets/DatasetList";

export default function DatasetsTab(props: DatasetsTabProps) {
  const { datasetId, onNext } = props;
  const {
    datasets,
    isLoading,
    isLoadingColumns,
    viewingId,
    canProceed,
    datasetName,
    datasetDescription,
    uploadedFile,
    isDragging,
    isUploading,
    fileInputRef,
    viewModalData,
    confirmDeleteId,
    deletingId,
    datasetPendingDelete,
    setDatasetName,
    setDatasetDescription,
    setUploadedFile,
    setIsDragging,
    setConfirmDeleteId,
    setViewModalData,
    handleFileSelect,
    resetForm,
    handleCreateDataset,
    handleDatasetSelect,
    handleViewDataset,
    handleDeleteDataset,
    handleDrop,
  } = useAssessmentDatasetsTab(props);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <DatasetList
        datasets={datasets}
        datasetId={datasetId}
        isLoading={isLoading}
        isLoadingColumns={isLoadingColumns}
        viewingId={viewingId}
        canProceed={canProceed}
        onSelectDataset={handleDatasetSelect}
        onViewDataset={handleViewDataset}
        onRequestDelete={setConfirmDeleteId}
        onNext={onNext}
      />

      <CreatePanel
        datasetName={datasetName}
        datasetDescription={datasetDescription}
        uploadedFile={uploadedFile}
        isDragging={isDragging}
        isUploading={isUploading}
        fileInputRef={fileInputRef}
        onDatasetNameChange={setDatasetName}
        onDatasetDescriptionChange={setDatasetDescription}
        onFileSelect={handleFileSelect}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onRemoveFile={() => {
          setUploadedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
        onResetForm={resetForm}
        onCreateDataset={handleCreateDataset}
      />

      {viewModalData && (
        <DataViewModal
          title={viewModalData.name}
          headers={viewModalData.headers}
          rows={viewModalData.rows}
          onClose={() => setViewModalData(null)}
        />
      )}

      {confirmDeleteId !== null && (
        <Modal
          open
          onClose={() => setConfirmDeleteId(null)}
          maxWidth="max-w-md"
          maxHeight="max-h-[90vh]"
          showClose={false}
        >
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-status-error-bg">
                <span className="text-status-error">
                  <WarningIcon className="w-5 h-5" />
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Delete dataset
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Are you sure you want to delete
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-text-primary">
                  {datasetPendingDelete?.dataset_name}?
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                void handleDeleteDataset(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
              disabled={deletingId === confirmDeleteId}
            >
              {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
