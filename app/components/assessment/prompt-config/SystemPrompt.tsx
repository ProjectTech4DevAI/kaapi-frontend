"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/app/components/icons";
import InfoTooltip from "@/app/components/InfoTooltip";
import type { ValueSetter } from "@/app/lib/types/assessment";
import PromptEditor from "./PromptEditor";

interface SystemPromptProps {
  value: string;
  onChange: ValueSetter<string>;
  previewMode: boolean;
}

export default function SystemPrompt({
  value,
  onChange,
  previewMode,
}: SystemPromptProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-primary">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left"
        >
          <ChevronDownIcon
            className={`h-4 w-4 text-text-secondary transition-transform ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
          <span className="text-base font-semibold text-text-primary">
            System prompt
          </span>
        </button>
        <InfoTooltip
          text={
            <span>
              Set the evaluation rules. Example: judge every answer fairly,
              follow the scoring format, and explain the result briefly.
            </span>
          }
        />
      </div>

      {isOpen && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <PromptEditor
            value={value}
            onChange={onChange}
            previewMode={previewMode}
            enablePlaceholders={false}
            emptyPreviewText="Example system prompt preview appears here."
            placeholder={`Describe how AI should behave:\n\nYou are an evaluator. Judge answer quality.\nKeep reasoning concise and return strict output.`}
          />
        </div>
      )}
    </div>
  );
}
