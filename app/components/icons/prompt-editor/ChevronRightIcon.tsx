interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ChevronRightIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
