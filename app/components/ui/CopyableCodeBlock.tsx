"use client";

import React, { useState, useCallback } from "react";
import { useToast } from "@/app/hooks/useToast";
import { CheckIcon, CopyIcon } from "@/app/components/icons";

interface CopyableCodeBlockProps {
  children: React.ReactNode;
  copyText: string;
}

export default function CopyableCodeBlock({
  children,
  copyText,
}: CopyableCodeBlockProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [copyText, toast]);

  return (
    <div className="relative">
      <div className="text-sm font-mono pl-3 pr-10 py-2.5 rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto leading-[1.6] bg-bg-secondary text-text-primary">
        {children}
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md cursor-pointer hover:bg-neutral-200"
        title="Copy to clipboard"
      >
        {copied ? (
          <CheckIcon className="w-4 h-4 text-status-success" />
        ) : (
          <CopyIcon className="w-4 h-4 text-text-secondary" />
        )}
      </button>
    </div>
  );
}
