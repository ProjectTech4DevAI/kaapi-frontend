interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ExpandIcon({ className, style }: IconProps) {
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
        d="M14 4h6m0 0v6m0-6L14 10M10 20H4m0 0v-6m0 6l6-6"
      />
    </svg>
  );
}
