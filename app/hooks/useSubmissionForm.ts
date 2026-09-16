"use client";

/**
 * The "create submission set" form: name, description, and the file — picked from
 * the browser dialog or dropped on the zone, validated the same way either route.
 */
import { useCallback, useRef, useState } from "react";
import { useToast } from "@/app/hooks/useToast";
import { isAllowedDatasetFile } from "@/app/lib/utils/assessment";
import { MAX_DATASET_FILE_BYTES } from "@/app/lib/assessment/constants";
import type { UseSubmissionFormResult } from "@/app/lib/types/assessment";

const MAX_FILE_MB = MAX_DATASET_FILE_BYTES / (1024 * 1024);
const EXTENSION_RE = /\.(csv|xlsx|xls)$/i;

export function useSubmissionForm(): UseSubmissionFormResult {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const accept = useCallback(
    (candidate: File) => {
      if (!isAllowedDatasetFile(candidate.name)) {
        toast.error("Please select a CSV or Excel (.xlsx, .xls) file");
        return;
      }
      if (candidate.size > MAX_DATASET_FILE_BYTES) {
        toast.error(`File too large. Max ${MAX_FILE_MB}MB allowed.`);
        return;
      }
      setFile(candidate);
      setName((current) => current || candidate.name.replace(EXTENSION_RE, ""));
    },
    [toast],
  );

  const removeFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    removeFile();
  }, [removeFile]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.files?.[0];
      if (selected) accept(selected);
      event.target.value = "";
    },
    [accept],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = event.dataTransfer.files?.[0];
      if (dropped) accept(dropped);
    },
    [accept],
  );

  return {
    name,
    description,
    file,
    isDragging,
    fileInputRef,
    setName,
    setDescription,
    setIsDragging,
    removeFile,
    reset,
    handleFileSelect,
    handleDrop,
  };
}
