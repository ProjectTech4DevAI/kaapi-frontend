"use client";

import type { PromptPanelProps } from "@/app/lib/types/assessment";
import SystemPrompt from "./SystemPrompt";

export default function PromptPanel({
  systemInstruction,
  setSystemInstruction,
}: PromptPanelProps) {
  return (
    <section className="min-w-0 space-y-4">
      <SystemPrompt
        value={systemInstruction}
        onChange={setSystemInstruction}
        previewMode={false}
      />
    </section>
  );
}
