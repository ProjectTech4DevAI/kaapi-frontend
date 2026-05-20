"use client";

import { MouseEvent } from "react";
import { CloseIcon, DocumentFileIcon } from "@/app/components/icons";

export interface AttachmentChipFile {
  id: string;
  kind: "image" | "pdf";
  name: string;
  mimeType: string;
  previewUrl: string;
}

interface AttachmentChipProps {
  file: AttachmentChipFile;
  onRemove: () => void;
  onPreview: () => void;
}

export default function AttachmentChip({
  file,
  onRemove,
  onPreview,
}: AttachmentChipProps) {
  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };
  if (file.kind === "image") {
    return (
      <div className="relative group">
        <button
          type="button"
          onClick={onPreview}
          aria-label={`Preview ${file.name}`}
          title={`Preview ${file.name}`}
          className="block rounded-lg overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-16 h-16 rounded-lg object-cover bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)]"
          />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Remove ${file.name}`}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text-primary text-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <CloseIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${file.name}`}
        title={`Preview ${file.name}`}
        className="inline-flex items-center gap-2 pr-7 pl-2 py-1.5 rounded-lg bg-bg-primary shadow-[0_2px_6px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] hover:bg-bg-secondary transition-colors cursor-pointer text-left"
      >
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-accent-primary text-white shrink-0">
          <DocumentFileIcon className="w-4 h-4" />
        </span>
        <span className="flex flex-col min-w-0 max-w-[180px]">
          <span
            className="text-sm font-medium text-text-primary truncate"
            title={file.name}
          >
            {file.name}
          </span>
          <span className="text-[11px] text-text-secondary">PDF</span>
        </span>
      </button>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text-primary text-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:bg-neutral-800 transition-colors cursor-pointer"
      >
        <CloseIcon className="w-3 h-3" />
      </button>
    </div>
  );
}
