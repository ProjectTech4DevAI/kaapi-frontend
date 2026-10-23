import Link from "next/link";
import { ChevronRightIcon } from "@/app/components/icons";

interface ChatbotBreadcrumbProps {
  name: string | null;
  sessionId: string | null;
}

export default function ChatbotBreadcrumb({
  name,
  sessionId,
}: ChatbotBreadcrumbProps) {
  const separator = (
    <ChevronRightIcon className="w-3.5 h-3.5 text-text-secondary shrink-0" />
  );
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 min-w-0 text-sm"
    >
      <Link
        href="/chatbot"
        className="font-semibold text-text-primary hover:text-accent-primary shrink-0"
      >
        Chatbot
      </Link>
      {name && (
        <>
          {separator}
          <span className="font-medium text-text-primary truncate">{name}</span>
        </>
      )}
      {sessionId && (
        <>
          {separator}
          <span className="text-text-secondary truncate font-mono text-xs">
            {sessionId}
          </span>
        </>
      )}
    </nav>
  );
}
