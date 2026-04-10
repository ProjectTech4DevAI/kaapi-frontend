interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function CloseIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-6 h-6 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
