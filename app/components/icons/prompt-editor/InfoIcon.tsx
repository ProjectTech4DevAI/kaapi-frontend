interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function InfoIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-3.5 h-3.5 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
