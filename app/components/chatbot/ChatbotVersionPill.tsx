interface ChatbotVersionPillProps {
  version: { version: number; isLive: boolean } | null;
}

export default function ChatbotVersionPill({
  version,
}: ChatbotVersionPillProps) {
  let label = "Not saved";
  let colors = "bg-bg-secondary text-text-secondary";
  if (version) {
    label = `${version.isLive ? "Live" : "Draft"} · v${version.version}`;
    colors = version.isLive
      ? "bg-status-success-bg text-status-success-text"
      : "bg-status-warning-bg text-status-warning-text";
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${colors}`}
    >
      {label}
    </span>
  );
}
