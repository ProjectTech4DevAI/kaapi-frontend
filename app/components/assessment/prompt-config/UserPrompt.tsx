"use client";

import { useState } from "react";
import { ChevronDownIcon } from "@/app/components/icons";
import InfoTooltip from "@/app/components/InfoTooltip";
import type { SampleRow, ValueSetter } from "@/app/lib/types/assessment";
import PromptEditor from "./PromptEditor";

interface UserPromptProps {
  textColumns: string[];
  sampleRow: SampleRow;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
  previewMode: boolean;
}

export default function UserPrompt({
  textColumns,
  sampleRow,
  promptTemplate,
  setPromptTemplate,
  previewMode,
}: UserPromptProps) {
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
            User prompt
          </span>
        </button>
        <InfoTooltip
          text={
            <span>
              Example: Evaluate this response for question {"{question}"} and
              answer {"{answer}"}.
            </span>
          }
        />
      </div>

      {isOpen && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <PromptEditor
            value={promptTemplate}
            onChange={setPromptTemplate}
            previewMode={previewMode}
            textColumns={textColumns}
            sampleRow={sampleRow}
            enablePlaceholders
            emptyPreviewText="Preview will appear here."
            placeholder={`Describe what the AI should do.\n\nExample:\nEvaluate the student's answer.\nQuestion: {question}\nAnswer: {answer}\nContext: {context}`}
          />
        </div>
      )}
    </div>
  );
}
