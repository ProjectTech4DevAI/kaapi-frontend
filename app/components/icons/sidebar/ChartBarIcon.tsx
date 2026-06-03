interface IconProps {
  className?: string;
}

export default function ChartBarIcon({ className }: IconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3v18h18M7 16V11m5 5V7m5 9v-3"
      />
    </svg>
  );
}
