interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function PlusIcon({ className, style }: IconProps) {
  return (
    <svg
      className={`w-4 h-4 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
