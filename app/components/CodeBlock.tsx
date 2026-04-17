import type { ReactNode } from "react";

interface CodeBlockProps {
  children: ReactNode;
}

export default function CodeBlock({ children }: CodeBlockProps) {
  return (
    <div className="text-sm font-mono px-3 py-2.5 rounded-md whitespace-pre-wrap max-h-60 overflow-y-auto leading-[1.6] bg-bg-secondary text-text-primary">
      {children}
    </div>
  );
}
