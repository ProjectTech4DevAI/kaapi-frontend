interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function LockClosedIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-3 h-3 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
      style={style}
    >
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path strokeLinecap="round" d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  );
}
