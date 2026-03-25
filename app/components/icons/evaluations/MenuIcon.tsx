interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function MenuIcon({ className, style }: IconProps) {
  return (
    <svg
      className={className ?? "w-5 h-5"}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
