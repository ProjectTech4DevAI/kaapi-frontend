interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ChevronUpIcon({ className, style }: IconProps) {
  return (
    <svg className={`w-3.5 h-3.5 ${className ?? ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={style}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}
