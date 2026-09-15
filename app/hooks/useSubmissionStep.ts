"use client";

/**
 * Wizard step 1 — submission sets. Composes the list (useSubmissionList) and the
 * create form (useSubmissionForm), owns selection plus the create/view/delete
 * actions, and reports the selection into the assessment store so later steps can
 * read the set's columns and sample row.
 */
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { useAssessmentData } from "@/app/hooks/useAssessmentData";
import { useSubmissionForm } from "@/app/hooks/useSubmissionForm";
import { useSubmissionList } from "@/app/hooks/useSubmissionList";
import { useAssessmentDatasetStore } from "@/app/lib/store/assessment";
import { nonBlankColumns } from "@/app/lib/utils/assessment";
import { getAsyncErrorMessage } from "@/app/lib/assessment/results";
import type {
  DatasetViewModalData,
  UseSubmissionStepResult,
} from "@/app/lib/types/assessment";

export function useSubmissionStep(): UseSubmissionStepResult {
  const toast = useToast();
  const data = useAssessmentData();
  const form = useSubmissionForm();
  const list = useSubmissionList();

  const selectedId = useAssessmentDatasetStore((state) => state.datasetId);
  const setDataset = useAssessmentDatasetStore((state) => state.setDataset);
  const setDatasetId = useAssessmentDatasetStore((state) => state.setDatasetId);
  const setDatasetName = useAssessmentDatasetStore(
    (state) => state.setDatasetName,
  );

  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewModalData, setViewModalData] =
    useState<DatasetViewModalData | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (id: string, selectedName?: string) => {
      setDatasetId(id);
      if (!id) {
        setDatasetName("");
        return;
      }

      const resolvedName =
        selectedName ??
        list.submissions.find((item) => item.submission_id === id)?.name ??
        "";
      setDatasetName(resolvedName);
      setIsLoadingColumns(true);
      try {
        const preview = await list.loadPreview(id);
        const { headers, sampleRow } = nonBlankColumns(preview);
        setDataset(id, headers, sampleRow, resolvedName);
      } catch (caught) {
        setDatasetId("");
        setDatasetName("");
        toast.error(getAsyncErrorMessage("load submission columns", caught));
      } finally {
        setIsLoadingColumns(false);
      }
    },
    [list, setDataset, setDatasetId, setDatasetName, toast],
  );

  const handleCreate = useCallback(async () => {
    if (!form.file || !form.name.trim()) return;
    setIsCreating(true);
    try {
      const created = await data.createSubmission({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        file: form.file,
      });
      await list.reload();
      form.reset();
      toast.success(`Submission set "${created.name}" created`);
      await handleSelect(created.submission_id, created.name);
    } catch (caught) {
      toast.error(getAsyncErrorMessage("create submission set", caught));
    } finally {
      setIsCreating(false);
    }
  }, [data, form, handleSelect, list, toast]);

  const handleView = useCallback(
    async (submissionId: string, viewName: string) => {
      setViewingId(submissionId);
      try {
        const preview = await list.loadPreview(String(submissionId));
        setViewModalData({
          name: viewName,
          headers: preview.headers,
          rows: preview.rows,
        });
      } catch (caught) {
        toast.error(getAsyncErrorMessage("open submission set", caught));
      } finally {
        setViewingId(null);
      }
    },
    [list, toast],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await data.deleteSubmission(id);
        list.forgetPreview(String(id));
        if (selectedId === id.toString()) {
          setDatasetId("");
          setDatasetName("");
        }
        await list.reload();
        toast.success("Submission set deleted");
      } catch (caught) {
        toast.error(getAsyncErrorMessage("delete submission set", caught));
      } finally {
        setDeletingId(null);
      }
    },
    [data, list, selectedId, setDatasetId, setDatasetName, toast],
  );

  // The wizard can preselect a version's linked set before the list arrives.
  useEffect(() => {
    const selected = list.submissions.find(
      (item) => item.submission_id === selectedId,
    );
    if (selected) setDatasetName(selected.name);
  }, [list.submissions, selectedId, setDatasetName]);

  return {
    form,
    submissions: list.submissions,
    selectedId,
    isLoading: list.isLoading,
    isLoadingColumns,
    isCreating,
    viewingId,
    deletingId,
    viewModalData,
    confirmDeleteId,
    pendingDelete: list.submissions.find(
      (item) => item.submission_id === confirmDeleteId,
    ),
    setConfirmDeleteId,
    setViewModalData,
    handleCreate,
    handleSelect,
    handleView,
    handleDelete,
  };
}
