interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function CheckCircleIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-3 h-3 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
