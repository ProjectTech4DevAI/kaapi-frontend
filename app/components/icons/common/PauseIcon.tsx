interface IconProps {
  className?: string;
}

export default function PauseIcon({ className }: IconProps) {
  return (
    <svg
      className={`w-5 h-5 ${className ?? ""}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  );
}
