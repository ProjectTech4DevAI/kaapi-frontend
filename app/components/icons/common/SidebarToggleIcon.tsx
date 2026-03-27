interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  collapsed?: boolean;
}

/**
 * Double-chevron icon for sidebar toggle.
 * Points right (expand) when collapsed, left (collapse) when expanded.
 */
export default function SidebarToggleIcon({
  className,
  style,
  collapsed = false,
}: IconProps) {
  return (
    <svg
      className={`w-4 h-4 ${className ?? ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      style={style}
    >
      {collapsed ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 5l7 7-7 7M5 5l7 7-7 7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
        />
      )}
    </svg>
  );
}
