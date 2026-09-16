interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function HomeIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-4 h-4 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10.5L12 3l9 7.5M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5"
      />
    </svg>
  );
}
