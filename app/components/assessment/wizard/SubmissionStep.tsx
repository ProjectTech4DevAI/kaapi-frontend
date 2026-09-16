"use client";

import { Button, Modal } from "@/app/components/ui";
import { WarningIcon } from "@/app/components/icons";
import DataViewModal from "@/app/components/assessment/DataViewModal";
import CreatePanel from "@/app/components/assessment/datasets/CreatePanel";
import SubmissionList from "@/app/components/assessment/datasets/SubmissionList";
import type { SubmissionStepProps } from "@/app/lib/types/assessment";

export default function SubmissionStep({ step }: SubmissionStepProps) {
  const { confirmDeleteId, pendingDelete } = step;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SubmissionList
        submissions={step.submissions}
        selectedId={step.selectedId}
        isLoading={step.isLoading}
        isLoadingColumns={step.isLoadingColumns}
        viewingId={step.viewingId}
        onSelect={step.handleSelect}
        onView={step.handleView}
        onRequestDelete={step.setConfirmDeleteId}
      />

      <CreatePanel
        form={step.form}
        isCreating={step.isCreating}
        onCreate={step.handleCreate}
      />

      {step.viewModalData && (
        <DataViewModal
          title={step.viewModalData.name}
          headers={step.viewModalData.headers}
          rows={step.viewModalData.rows}
          onClose={() => step.setViewModalData(null)}
        />
      )}

      {confirmDeleteId !== null && (
        <Modal
          open
          onClose={() => step.setConfirmDeleteId(null)}
          maxWidth="max-w-md"
          maxHeight="max-h-[90vh]"
          showClose={false}
        >
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-status-error-bg text-status-error">
                <WarningIcon className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  Delete submission
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Are you sure you want to delete{" "}
                  <b className="break-all text-text-primary">
                    {pendingDelete?.name}
                  </b>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => step.setConfirmDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={step.deletingId === confirmDeleteId}
              onClick={() => {
                void step.handleDelete(confirmDeleteId);
                step.setConfirmDeleteId(null);
              }}
            >
              {step.deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
