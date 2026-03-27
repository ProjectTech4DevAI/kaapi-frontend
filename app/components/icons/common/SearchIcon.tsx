interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function SearchIcon({ className, style }: IconProps) {
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
