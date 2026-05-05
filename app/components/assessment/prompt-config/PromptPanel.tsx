"use client";

import { useState } from "react";
import { Button } from "@/app/components";
import type { SampleRow, ValueSetter } from "@/app/lib/types/assessment";

interface PromptPanelProps {
  textColumns: string[];
  sampleRow: SampleRow;
  systemInstruction: string;
  setSystemInstruction: ValueSetter<string>;
  promptTemplate: string;
  setPromptTemplate: ValueSetter<string>;
}
import UserPrompt from "./UserPrompt";
import SystemPrompt from "./SystemPrompt";

export default function PromptPanel({
  textColumns,
  sampleRow,
  systemInstruction,
  setSystemInstruction,
  promptTemplate,
  setPromptTemplate,
}: PromptPanelProps) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
          <Button
            type="button"
            variant={!previewMode ? "primary" : "ghost"}
            size="sm"
            onClick={() => setPreviewMode(false)}
            className="!rounded-lg !px-3 !py-1.5 !text-xs"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant={previewMode ? "primary" : "ghost"}
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="!rounded-lg !px-3 !py-1.5 !text-xs"
          >
            Preview
          </Button>
        </div>
      </div>

      <SystemPrompt
        value={systemInstruction}
        onChange={setSystemInstruction}
        previewMode={previewMode}
      />
      <UserPrompt
        textColumns={textColumns}
        sampleRow={sampleRow}
        promptTemplate={promptTemplate}
        setPromptTemplate={setPromptTemplate}
        previewMode={previewMode}
      />
    </section>
  );
}
