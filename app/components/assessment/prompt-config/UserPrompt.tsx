"use client";

import { useState } from "react";
import { Button } from "@/app/components";
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
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsOpen((prev) => !prev)}
          className="!min-w-0 !flex-1 !justify-start !rounded-md !p-0 hover:bg-transparent focus-visible:bg-transparent"
        >
          <ChevronDownIcon
            className={`h-4 w-4 text-text-secondary transition-transform ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
          <span className="text-base font-semibold text-text-primary">
            User prompt
          </span>
        </Button>
        <InfoTooltip
          text={
            <span>
              Tell the AI what to check in each row. Example: Read{" "}
              {"{question}"}
              and {"{answer}"}, then say if the answer is good and why.
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
