"use client";

import { useRef } from "react";
import { Button, Field, Modal } from "@/app/components";
import { CloudUploadIcon, InfoIcon } from "@/app/components/icons";

export interface UploadDatasetModalProps {
  open: boolean;
  selectedFile: File | null;
  datasetName: string;
  duplicationFactor: string;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDatasetNameChange: (value: string) => void;
  onDuplicationFactorChange: (value: string) => void;
  onUpload: () => void;
  onClose: () => void;
}

export default function UploadDatasetModal({
  open,
  selectedFile,
  datasetName,
  duplicationFactor,
  isUploading,
  onFileSelect,
  onDatasetNameChange,
  onDuplicationFactorChange,
  onUpload,
  onClose,
}: UploadDatasetModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDisabled = !selectedFile || !datasetName.trim() || isUploading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload New Dataset"
      maxWidth="max-w-2xl"
      maxHeight="max-h-[90vh]"
    >
      <div className="p-6">
        <p className="text-sm mb-6 text-text-secondary">
          Upload a CSV file containing your QnA dataset.
        </p>

        <div className="border-2 border-dashed rounded-lg p-12 text-center transition-colors border-border">
          <div className="space-y-4">
            <div className="text-text-secondary">
              <CloudUploadIcon className="mx-auto" />
            </div>
            <input
              ref={fileInputRef}
              id="dataset-file-upload"
              type="file"
              accept=".csv"
              onChange={onFileSelect}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              variant="primary"
              size="md"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Choose CSV File
            </Button>
            {selectedFile && (
              <div className="text-sm text-text-secondary">
                Selected:{" "}
                <span className="font-medium text-text-primary">
                  {selectedFile.name}
                </span>
                <span className="ml-2">
                  ({Math.round(selectedFile.size / 1024)} KB)
                </span>
              </div>
            )}
          </div>
        </div>

        {selectedFile && (
          <>
            <div className="mt-6">
              <Field
                label="Dataset Name *"
                value={datasetName}
                onChange={onDatasetNameChange}
                placeholder="Enter dataset name"
                disabled={isUploading}
              />
            </div>

            <div className="mt-4">
              <Field
                label="Duplication Factor (Optional)"
                type="number"
                value={duplicationFactor}
                onChange={onDuplicationFactorChange}
                placeholder="1"
                disabled={isUploading}
              />
              <p className="text-xs mt-1 text-text-secondary">
                Number of times to duplicate the dataset rows (leave empty or 1
                for no duplication).
              </p>
            </div>
          </>
        )}

        <div className="mt-6 rounded-md p-3 bg-accent-primary/5 border border-accent-primary/20">
          <div className="flex gap-2">
            <InfoIcon className="w-4 h-4 shrink-0 mt-0.5 text-accent-primary" />
            <div>
              <p className="text-xs font-medium mb-1 text-text-primary">
                Expected CSV Format:
              </p>
              <pre className="text-xs font-mono text-text-secondary">
                {`question,answer
"What is X?","Answer Y"`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <Button variant="outline" onClick={onClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onUpload} disabled={isDisabled}>
          {isUploading ? "Uploading..." : "Upload Dataset"}
        </Button>
      </div>
    </Modal>
  );
}
