interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ImageIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 15l-4.5-4.5L9 18"
      />
    </svg>
  );
}
