interface IconProps {
  className?: string;
}

export default function FlowIcon({ className }: IconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="16" width="7" height="5" rx="1.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 8v4a2 2 0 002 2h7a2 2 0 012 2"
      />
    </svg>
  );
}
