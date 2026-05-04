"use client";

import { useState } from "react";
import type { PromptPanelProps } from "@/app/lib/types/assessment";
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

  const toggleClass = (active: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
      active
        ? "bg-accent-primary text-white"
        : "bg-transparent text-text-secondary"
    }`;

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-bg-secondary p-1">
          <button
            onClick={() => setPreviewMode(false)}
            className={toggleClass(!previewMode)}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className={toggleClass(previewMode)}
          >
            Preview
          </button>
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
