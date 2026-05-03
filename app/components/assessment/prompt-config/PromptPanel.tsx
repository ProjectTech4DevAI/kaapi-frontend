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

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <div
          className="flex items-center gap-1 rounded-xl border p-1"
          style={{
            backgroundColor: "var(--background-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <button
            onClick={() => setPreviewMode(false)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: !previewMode
                ? "var(--foreground)"
                : "transparent",
              color: !previewMode ? "#ffffff" : "var(--muted)",
            }}
          >
            Edit
          </button>
          <button
            onClick={() => setPreviewMode(true)}
            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={{
              backgroundColor: previewMode
                ? "var(--foreground)"
                : "transparent",
              color: previewMode ? "#ffffff" : "var(--muted)",
            }}
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
