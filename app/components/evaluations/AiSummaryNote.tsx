"use client";

import { InfoIcon } from "@/app/components/icons";

interface AiSummaryNoteProps {
  summary: string;
}

export default function AiSummaryNote({ summary }: AiSummaryNoteProps) {
  return (
    <div className="flex items-start gap-2 rounded-lg px-4 py-3 bg-accent-primary/5 border border-accent-primary/20 text-sm text-text-primary">
      <InfoIcon className="w-4 h-4 mt-0.5 shrink-0 text-accent-primary" />
      <p>{summary}</p>
    </div>
  );
}
