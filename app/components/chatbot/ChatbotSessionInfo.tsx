import {
  ChatbotCompletionStatus,
  ChatbotSessionStatus,
} from "@/app/lib/types/chatbot";

const NEUTRAL = "bg-bg-secondary text-text-secondary";
const SUCCESS = "bg-status-success-bg text-status-success-text";
const WARNING = "bg-status-warning-bg text-status-warning-text";

function badgeFor(
  status: ChatbotSessionStatus | null,
  completionStatus: ChatbotCompletionStatus | null,
): { label: string; className: string } | null {
  if (!status) return null;
  // Inactive = superseded by a newer session of the same chatbot.
  if (status === "inactive") return { label: "Closed", className: NEUTRAL };
  switch (completionStatus) {
    case "complete":
      return { label: "Complete", className: SUCCESS };
    case "abandoned":
      return { label: "Abandoned", className: NEUTRAL };
    case "in_progress":
      return { label: "In progress", className: WARNING };
    default:
      return { label: "Active", className: SUCCESS };
  }
}

export function ChatbotStatusBadge({
  status,
  completionStatus,
}: {
  status: ChatbotSessionStatus | null;
  completionStatus: ChatbotCompletionStatus | null;
}) {
  const badge = badgeFor(status, completionStatus);
  if (!badge) return null;
  return (
    <span
      className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
