import type { CommitMessageProps, ParsedCommit } from "@/app/lib/types/commit";

const AI_GENERATED_PATTERN =
  /^\[AI Generated\]\s*(?:improved from config version\s+v(\d+))?\s*(?:\(Evaluation:\s*([^)]+)\))?\s*(.*)$/i;

export function parseCommitMessage(
  message: string | null | undefined,
): ParsedCommit {
  if (!message) return { isAIGenerated: false, body: "" };
  const match = message.match(AI_GENERATED_PATTERN);
  if (!match) return { isAIGenerated: false, body: message };
  const [, fromVersionRaw, evalName, body] = match;
  return {
    isAIGenerated: true,
    fromVersion: fromVersionRaw ? parseInt(fromVersionRaw, 10) : undefined,
    evaluation: evalName?.trim(),
    body: body?.trim() ?? "",
  };
}

export default function CommitMessage({
  message,
  className = "",
  compact = false,
}: CommitMessageProps) {
  const parsed = parseCommitMessage(message);

  if (!parsed.isAIGenerated) {
    return message ? <span className={className}>{message}</span> : null;
  }

  const metaParts: string[] = [];
  if (parsed.fromVersion !== undefined) {
    metaParts.push(`From v${parsed.fromVersion}`);
  }
  if (parsed.evaluation) {
    metaParts.push(`Eval: ${parsed.evaluation}`);
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-accent-primary/10 text-accent-primary">
          AI Generated
        </span>
        {metaParts.length > 0 && (
          <span className="text-xs text-text-secondary">
            {metaParts.join(" • ")}
          </span>
        )}
      </div>
      {parsed.body && (
        <div
          className={
            compact
              ? "text-xs text-text-primary max-h-24 overflow-y-auto pr-1 whitespace-pre-wrap"
              : "text-xs text-text-primary whitespace-pre-wrap"
          }
        >
          {parsed.body}
        </div>
      )}
    </div>
  );
}
