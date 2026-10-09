/**
 * LlmNodeAdvanced - Collapsible per-request limits for an LLM node.
 */

"use client";

import { useState } from "react";
import { Field } from "@/app/components/ui";
import { ChevronDownIcon, ChevronUpIcon } from "@/app/components/icons";
import { ChatbotNodeData } from "@/app/lib/types/chatbot";

interface LlmNodeAdvancedProps {
  data: ChatbotNodeData;
  onChange: (patch: Partial<ChatbotNodeData>) => void;
}

function toPositiveInt(value: string, fallback: number): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function LlmNodeAdvanced({
  data,
  onChange,
}: LlmNodeAdvancedProps) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="nodrag w-full flex items-center justify-center gap-1 py-1 text-xs font-semibold text-text-primary hover:text-accent-primary cursor-pointer"
      >
        Advanced
        <Chevron className="w-3 h-3" />
      </button>
      {open && (
        <div className="nodrag grid grid-cols-2 gap-2 pt-2">
          <Field
            label="Max tokens"
            type="number"
            value={String(data.maxTokens)}
            onChange={(v) =>
              onChange({ maxTokens: toPositiveInt(v, data.maxTokens) })
            }
          />
          <Field
            label="History token limit"
            type="number"
            value={String(data.historyTokenLimit)}
            onChange={(v) =>
              onChange({
                historyTokenLimit: toPositiveInt(v, data.historyTokenLimit),
              })
            }
          />
        </div>
      )}
    </div>
  );
}
