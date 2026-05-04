"use client";

import { useMemo, useState } from "react";
import { ChevronRightIcon, CloseIcon } from "@/app/components/icons";
import type {
  InputReviewProps,
  PromptNodeProps,
} from "@/app/lib/types/assessment";
import ReviewSection from "./ReviewSection";

const DEFAULT_SYSTEM_PROMPT = "(not set)";
const DEFAULT_USER_PROMPT =
  "(not set: backend concatenates mapped text columns)";

function PromptNode({
  title,
  value,
  fallback,
  isOpen,
  onToggle,
}: PromptNodeProps) {
  return (
    <div>
      <div className="flex items-center gap-2 text-neutral-700">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-neutral-100"
          aria-label={`Toggle ${title}`}
        >
          <ChevronRightIcon
            className={`h-3.5 w-3.5 transition-transform ${
              isOpen ? "rotate-90" : "rotate-0"
            }`}
          />
        </button>
        <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      </div>
      {isOpen && (
        <pre className="mt-2 whitespace-pre-wrap pl-5 font-mono text-xs text-neutral-700">
          {value.trim() || fallback}
        </pre>
      )}
    </div>
  );
}

export default function InputReview({
  systemInstruction,
  promptTemplate,
  isOpen,
  onToggle,
}: InputReviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSystemNodeOpen, setIsSystemNodeOpen] = useState(true);
  const [isUserNodeOpen, setIsUserNodeOpen] = useState(true);

  const llmInputGist = useMemo(
    () => ({
      system: systemInstruction.trim() || DEFAULT_SYSTEM_PROMPT,
      user: promptTemplate.trim() || DEFAULT_USER_PROMPT,
    }),
    [promptTemplate, systemInstruction],
  );

  return (
    <>
      <ReviewSection
        title="LLM Input"
        isOpen={isOpen}
        onToggle={onToggle}
        headerAction={
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsModalOpen(true);
            }}
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Expand LLM input"
            title="Expand LLM input"
          >
            <span className="text-xl leading-none">⤢</span>
          </button>
        }
        badge={
          systemInstruction.trim() || promptTemplate.trim()
            ? "Configured"
            : "Default"
        }
      >
        <div className="space-y-2 pt-2">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              System Prompt
            </h3>
            <pre
              className="mt-1 whitespace-pre-wrap font-mono text-xs text-neutral-700"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {llmInputGist.system}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">User Prompt</h3>
            <pre
              className="mt-1 whitespace-pre-wrap font-mono text-xs text-neutral-700"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {llmInputGist.user}
            </pre>
          </div>
        </div>
      </ReviewSection>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
              <h3 className="text-sm font-semibold text-neutral-900">
                LLM Input
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-4 py-3">
              <div className="space-y-3">
                <PromptNode
                  title="System Prompt"
                  value={systemInstruction}
                  fallback={DEFAULT_SYSTEM_PROMPT}
                  isOpen={isSystemNodeOpen}
                  onToggle={() => setIsSystemNodeOpen((prev) => !prev)}
                />
                <PromptNode
                  title="User Prompt"
                  value={promptTemplate}
                  fallback={DEFAULT_USER_PROMPT}
                  isOpen={isUserNodeOpen}
                  onToggle={() => setIsUserNodeOpen((prev) => !prev)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
