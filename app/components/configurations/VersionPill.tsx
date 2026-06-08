interface VersionPillProps {
  version: number | string;
  /**
   * - "default": muted neutral chip
   * - "accent": filled with primary accent tint, used to call out the active /
   *   "after" version in diff and selection contexts.
   */
  tone?: "default" | "accent";
  size?: "sm" | "md";
  className?: string;
}

const TONE_CLASS: Record<NonNullable<VersionPillProps["tone"]>, string> = {
  default: "bg-bg-secondary text-text-secondary border-border",
  accent: "bg-accent-primary/10 text-accent-primary border-accent-primary/30",
};

const SIZE_CLASS: Record<NonNullable<VersionPillProps["size"]>, string> = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
};

export default function VersionPill({
  version,
  tone = "default",
  size = "md",
  className = "",
}: VersionPillProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${SIZE_CLASS[size]} ${TONE_CLASS[tone]} ${className}`}
    >
      v{version}
    </span>
  );
}
