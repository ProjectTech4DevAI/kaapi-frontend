"use client";

import { useState } from "react";
import { RadioGroup } from "@/app/components/ui";
import type { PromptPanelProps } from "@/app/lib/types/assessment";

type PromptViewMode = "edit" | "preview";
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
  const [viewMode, setViewMode] = useState<PromptViewMode>("edit");
  const previewMode = viewMode === "preview";

  return (
    <section className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <RadioGroup<PromptViewMode>
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Prompt view mode"
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
          ]}
        />
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
