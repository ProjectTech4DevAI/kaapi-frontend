"use client";

import { FormEvent, useState } from "react";
import { SendIcon } from "@/app/components/icons";

interface ChatbotChatInputProps {
  disabled: boolean;
  placeholder: string;
  /** Resolves false when sending failed, so the draft is restored. */
  onSend: (message: string) => Promise<boolean>;
}

export default function ChatbotChatInput({
  disabled,
  placeholder,
  onSend,
}: ChatbotChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || disabled) return;
    setInput("");
    if (!(await onSend(text))) setInput(text);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border p-3 flex items-center gap-2"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-3 py-2 rounded-full border border-border text-sm bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        title="Send"
        className="p-2 rounded-full bg-accent-primary text-white hover:bg-accent-hover disabled:bg-neutral-200 disabled:text-text-secondary cursor-pointer disabled:cursor-not-allowed"
      >
        <SendIcon className="w-4 h-4" />
      </button>
    </form>
  );
}
