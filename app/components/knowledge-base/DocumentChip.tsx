"use client";

import { CloseIcon } from "@/app/components/icons";
import FileExtBadge from "@/app/components/ui/FileExtBadge";

interface DocumentChipProps {
  fileName: string;
  onRemove?: () => void;
}

export default function DocumentChip({
  fileName,
  onRemove,
}: DocumentChipProps) {
  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border border-accent-primary bg-bg-secondary min-w-0">
      <FileExtBadge fileName={fileName} size="sm" />
      <span className="text-xs text-text-primary underline truncate flex-1 min-w-0">
        {fileName}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-0.5 rounded text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label={`Remove ${fileName}`}
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
