"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  InfoTooltip,
  Modal,
  RadioGroup,
  Select,
} from "@/app/components/ui";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExpandIcon,
} from "@/app/components/icons";
import ConfigSelector from "@/app/components/ConfigSelector";
import type {
  JudgeConfigDraft,
  JudgeConfigMode,
} from "@/app/lib/types/judgeConfig";
import { JUDGE_MODEL_OPTIONS } from "@/app/lib/constants";

interface JudgeConfigPanelProps {
  draft: JudgeConfigDraft;
  onChange: (draft: JudgeConfigDraft) => void;
  disabled?: boolean;
  error?: string;
}

export default function JudgeConfigPanel({
  draft,
  onChange,
  disabled = false,
  error,
}: JudgeConfigPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const modalTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!promptModalOpen) return;
    const el = modalTextareaRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
    el.scrollTop = el.scrollHeight;
  }, [promptModalOpen]);

  const patchAdhoc = (patch: Partial<JudgeConfigDraft["adhoc"]>) =>
    onChange({ ...draft, adhoc: { ...draft.adhoc, ...patch } });

  const patchSaved = (configId: string, version: number) =>
    onChange({
      ...draft,
      saved: { configId, version },
    });

  return (
    <div className="border border-border rounded-lg bg-bg-primary">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? "Collapse judge config" : "Expand judge config"}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-secondary transition-colors rounded-t-lg cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-text-primary">
            Judge Config (optional)
          </span>
          <span
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center"
          >
            <InfoTooltip
              text={
                <>
                  Judging always runs in <strong>Fast</strong> mode. This panel
                  only <em>tailors</em> the judge. Leave empty to use the
                  built-in prompt + fallback model (<code>gpt-4o-mini</code>).
                </>
              }
            />
          </span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
          <RadioGroup<JudgeConfigMode>
            ariaLabel="Judge config source"
            value={draft.mode}
            onChange={(mode) => onChange({ ...draft, mode })}
            disabled={disabled}
            options={[
              { value: "adhoc", label: "Ad-hoc" },
              { value: "saved", label: "Saved" },
            ]}
          />

          {draft.mode === "adhoc" ? (
            <>
              <div>
                <label className="block text-xs font-medium mb-1 text-text-secondary">
                  Prompt (plain text — backend appends question, answer, ground
                  truth, and JSON contract)
                </label>
                <div className="relative">
                  <textarea
                    value={draft.adhoc.promptTemplate}
                    onChange={(e) =>
                      patchAdhoc({ promptTemplate: e.target.value })
                    }
                    disabled={disabled}
                    rows={5}
                    placeholder={`Example:\nRate the answer's correctness against the ground truth on a 0.0–1.0 scale. Reward semantic match, penalize factual errors.`}
                    className="w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-3 py-2 pr-9 outline-none focus:ring-1 focus:ring-accent-primary/20 focus:border-accent-primary font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setPromptModalOpen(true)}
                    disabled={disabled}
                    aria-label="Expand prompt editor"
                    title="Expand"
                    className="absolute top-2 right-2 p-1 rounded-md text-text-secondary hover:bg-bg-secondary hover:text-text-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ExpandIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-text-secondary">
                    Model
                  </label>
                  <Select
                    value={draft.adhoc.model}
                    onChange={(e) => patchAdhoc({ model: e.target.value })}
                    disabled={disabled}
                    options={JUDGE_MODEL_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-text-secondary">
                    Temperature: {draft.adhoc.temperature.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.05}
                    value={draft.adhoc.temperature}
                    onChange={(e) =>
                      patchAdhoc({ temperature: parseFloat(e.target.value) })
                    }
                    disabled={disabled}
                    className="w-full accent-accent-primary"
                  />
                </div>
              </div>
            </>
          ) : (
            <ConfigSelector
              selectedConfigId={draft.saved.configId}
              selectedVersion={draft.saved.version}
              onConfigSelect={patchSaved}
              disabled={disabled}
              compact
            />
          )}

          {error && <p className="text-xs text-status-error-text">{error}</p>}
        </div>
      )}

      <Modal
        open={promptModalOpen}
        onClose={() => setPromptModalOpen(false)}
        title="Judge Prompt"
        subtitle="Plain text — backend appends question, answer, ground truth, and JSON contract automatically."
        maxWidth="max-w-3xl"
        maxHeight="max-h-[85vh]"
      >
        <div className="flex flex-col h-full min-h-0 px-6 py-4">
          <textarea
            ref={modalTextareaRef}
            value={draft.adhoc.promptTemplate}
            onChange={(e) => patchAdhoc({ promptTemplate: e.target.value })}
            disabled={disabled}
            placeholder={`Example:\nRate the answer's correctness against the ground truth on a 0.0–1.0 scale. Reward semantic match, penalize factual errors.`}
            className="flex-1 min-h-[400px] w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-3 py-2 outline-none focus:ring-1 focus:ring-accent-primary/20 focus:border-accent-primary font-mono resize-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPromptModalOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPromptModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
