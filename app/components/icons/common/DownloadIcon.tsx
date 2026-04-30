interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function DownloadIcon({ className, style }: IconProps) {
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
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}
