"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field } from "@/app/components";
import Select from "@/app/components/Select";
import {
  CheckLineIcon,
  CloseIcon,
  CloudUploadIcon,
} from "@/app/components/icons";

interface CreateDatasetFormProps {
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  duplicationFactor: string;
  setDuplicationFactor: (factor: string) => void;
  uploadedFile: File | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  isUploading: boolean;
  handleCreateDataset: () => void | Promise<boolean>;
  resetForm: () => void;
}

export default function CreateDatasetForm({
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  duplicationFactor,
  setDuplicationFactor,
  uploadedFile,
  onFileSelect,
  onRemoveFile,
  isUploading,
  handleCreateDataset,
  resetForm,
}: CreateDatasetFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showDuplicationInfo, setShowDuplicationInfo] = useState(false);
  const [duplicationInfoPos, setDuplicationInfoPos] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    if (!showDuplicationInfo) return;
    const handleClick = () => setShowDuplicationInfo(false);
    const handleScroll = () => setShowDuplicationInfo(false);
    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [showDuplicationInfo]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(
          new Event("change", { bubbles: true }),
        );
      }
    }
  };

  const isCreateDisabled = !uploadedFile || !datasetName.trim() || isUploading;

  return (
    <div className="flex-1 overflow-auto p-4 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-text-primary">
          Create New Dataset
        </h2>
        <p className="text-xs mt-0.5 text-text-secondary">
          Upload a CSV with golden question-answer pairs
        </p>
      </div>

      <Field
        label="Name *"
        value={datasetName}
        onChange={setDatasetName}
        placeholder="e.g., QnA Dataset v1"
      />

      <Field
        label="Description"
        value={datasetDescription}
        onChange={setDatasetDescription}
        placeholder="Optional description"
      />

      <div>
        <label className="text-xs font-medium mb-1.5 text-text-secondary">
          <span className="inline-flex items-center gap-1">
            Duplication Factor
            <span
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-normal cursor-pointer shrink-0 bg-bg-primary border border-border text-text-secondary"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setDuplicationInfoPos({
                  top: rect.bottom + 4,
                  left: rect.left,
                });
                setShowDuplicationInfo(!showDuplicationInfo);
              }}
            >
              i
            </span>
            {showDuplicationInfo && (
              <div
                className="fixed z-50 rounded-lg shadow-lg border text-xs p-3 bg-bg-primary border-border w-[280px]"
                style={{
                  top: duplicationInfoPos.top,
                  left: duplicationInfoPos.left,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-semibold mb-1 text-text-primary">
                  Duplication Factor
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Controls how many times each question is sent to the AI to
                  generate an answer. For example, setting this to 3 means the
                  AI answers each question 3 separate times — helpful for
                  checking if the AI gives consistent and reliable responses
                  each time.
                </p>
              </div>
            )}
          </span>
        </label>
        <Select
          value={duplicationFactor}
          onChange={(e) => setDuplicationFactor(e.target.value)}
          options={[1, 2, 3, 4, 5].map((n) => ({
            value: String(n),
            label: String(n),
          }))}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5 text-text-secondary">
          Upload CSV *
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileSelect}
          className="hidden"
        />

        {uploadedFile ? (
          <div className="rounded-lg p-3 bg-bg-secondary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckLineIcon className="w-4 h-4 shrink-0 text-status-success" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onRemoveFile();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1 rounded text-text-secondary cursor-pointer"
                aria-label="Remove file"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? "border-accent-primary bg-blue-50/30"
                : "border-border"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CloudUploadIcon className="mx-auto h-8 w-8 mb-2 text-border" />
            <p className="text-sm font-medium mb-1 text-text-primary">
              Drop CSV here, or click to browse
            </p>
            <p className="text-xs text-text-secondary">
              Format:{" "}
              <span className="font-mono text-text-primary">
                question,answer
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" size="md" onClick={resetForm}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleCreateDataset}
          disabled={isCreateDisabled}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Dataset"
          )}
        </Button>
      </div>
    </div>
  );
}
