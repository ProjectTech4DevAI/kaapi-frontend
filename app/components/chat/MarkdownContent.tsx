"use client";

import { ReactNode, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CheckLineIcon, CopyIcon } from "@/app/components/icons";

interface MarkdownContentProps {
  text: string;
  className?: string;
  trailing?: ReactNode;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const language = className?.replace(/^language-/, "") ?? "";
  const handleCopy = async () => {
    const raw =
      typeof children === "string" ? children : String(children ?? "");
    try {
      await navigator.clipboard.writeText(raw.replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  return (
    <div className="relative my-3 rounded-lg border border-border bg-bg-secondary overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 border-b border-border">
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          {copied ? (
            <CheckLineIcon className="w-3.5 h-3.5 text-status-success" />
          ) : (
            <CopyIcon className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[13px] leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  p: ({ children }) => (
    <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-primary underline underline-offset-2 hover:text-accent-secondary"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-xl font-semibold text-text-primary">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-lg font-semibold text-text-primary">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-base font-semibold text-text-primary">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1.5 text-[15px] font-semibold text-text-primary">
      {children}
    </h4>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-border pl-3 italic text-text-secondary">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-bg-secondary">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-border px-2 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1.5 align-top">{children}</td>
  ),
  code: ({ className, children, ...rest }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code
        className="px-1 py-0.5 rounded bg-bg-secondary border border-border text-[0.9em] font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export default function MarkdownContent({
  text,
  className,
  trailing,
}: MarkdownContentProps) {
  return (
    <div
      className={`${className ?? ""} wrap-break-word [&_pre]:whitespace-pre-wrap`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {text}
      </ReactMarkdown>
      {trailing}
    </div>
  );
}
