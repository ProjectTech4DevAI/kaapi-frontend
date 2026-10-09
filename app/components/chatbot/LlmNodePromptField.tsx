/**
 * LlmNodePromptField - Inline system-prompt editor with an expanded modal view.
 */

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/app/components/ui";
import { ExpandIcon } from "@/app/components/icons";
import NodeFieldLabel from "@/app/components/chatbot/NodeFieldLabel";

interface LlmNodePromptFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const PLACEHOLDER =
  "Goal: Register a student. Friendly, short WhatsApp messages, one question at a time.";

export default function LlmNodePromptField({
  value,
  onChange,
}: LlmNodePromptFieldProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <NodeFieldLabel
        label="Prompt"
        hint="System prompt for this step. Editing it resets the test conversation."
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="Expand prompt"
          className="nodrag text-text-primary hover:text-accent-primary cursor-pointer"
        >
          <ExpandIcon className="w-3.5 h-3.5" />
        </button>
      </NodeFieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={4}
        className="nodrag nowheel w-full px-2.5 py-2 rounded-md border border-border text-xs text-text-primary bg-bg-primary placeholder:text-neutral-400 resize-none focus:outline-none focus:border-accent-primary"
      />

      {/* Portaled: the canvas viewport is CSS-transformed, which breaks `fixed`. */}
      {expanded &&
        createPortal(
          <Modal
            open
            onClose={() => setExpanded(false)}
            title="Prompt"
            maxWidth="max-w-3xl"
          >
            <div className="px-6 pb-6">
              <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={PLACEHOLDER}
                autoFocus
                className="w-full h-[60vh] px-3 py-2 rounded-lg border border-border text-sm font-mono text-text-primary bg-bg-primary placeholder:text-neutral-400 resize-none focus:outline-none focus:border-accent-primary"
              />
            </div>
          </Modal>,
          document.body,
        )}
    </div>
  );
}
