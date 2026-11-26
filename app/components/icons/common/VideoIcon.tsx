interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 10l5-3v10l-5-3"
      />
    </svg>
  );
}
