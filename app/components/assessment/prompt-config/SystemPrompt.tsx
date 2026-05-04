"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/app/components/icons";
import InfoTooltip from "@/app/components/InfoTooltip";
import type { SystemPromptProps } from "@/app/lib/types/assessment";
import PromptEditor from "./PromptEditor";

export default function SystemPrompt({
  value,
  onChange,
  previewMode,
}: SystemPromptProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--background)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronDownIcon
            className="h-4 w-4 transition-transform"
            style={{
              color: "var(--muted)",
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }}
          />
          <span
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            System prompt
          </span>
        </button>
        <InfoTooltip
          text={
            <span>
              Example: You are an evaluator. Score responses strictly and return
              concise feedback.
            </span>
          }
        />
      </div>

      {isOpen && (
        <div
          className="border-t px-5 pb-5 pt-4"
          style={{ borderColor: "var(--border)" }}
        >
          <PromptEditor
            value={value}
            onChange={onChange}
            previewMode={previewMode}
            enablePlaceholders={false}
            emptyPreviewText="Example system prompt preview appears here."
            placeholder={`Example:\nYou are an evaluator. Judge answer quality.\nKeep reasoning concise and return strict output.`}
          />
        </div>
      )}
    </div>
  );
}
