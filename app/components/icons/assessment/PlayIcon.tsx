interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function PlayIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className ?? ""}`}
      fill="currentColor"
      viewBox="0 0 24 24"
      style={style}
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
