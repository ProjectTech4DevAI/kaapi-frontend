"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/app/components";
import { ChevronRightIcon } from "@/app/components/icons";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT,
} from "@/app/lib/assessment/constants";
interface InputReviewProps {
  systemInstruction: string;
  promptTemplate: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface PromptNodeProps {
  title: string;
  value: string;
  fallback: string;
  isOpen: boolean;
  onToggle: () => void;
}
import ReviewSection from "./ReviewSection";

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
          className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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
            className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
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

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="LLM Input"
        maxWidth="max-w-3xl"
      >
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
      </Modal>
    </>
  );
}
