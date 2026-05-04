interface IconProps {
  className?: string;
}

export default function SendIcon({ className }: IconProps) {
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
        d="M5 12l14-7-7 14-2-5-5-2z"
      />
    </svg>
  );
}
