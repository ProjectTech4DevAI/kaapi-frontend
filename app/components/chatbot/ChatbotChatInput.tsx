"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/app/components/ui";
import { SendIcon } from "@/app/components/icons";

interface ChatbotChatInputProps {
  disabled: boolean;
  placeholder: string;
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
      className="border-t border-border bg-bg-primary p-3 flex items-center gap-2"
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 px-4 py-2.5 rounded-full border border-border text-sm bg-bg-primary text-text-primary focus:outline-none focus:border-accent-primary disabled:opacity-60"
      />
      <Button type="submit" disabled={disabled || !input.trim()}>
        <SendIcon className="w-4 h-4" />
        Send
      </Button>
    </form>
  );
}
