interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function SpinnerIcon({ className, style }: IconProps) {
  return (
    <span
      aria-hidden
      style={style}
      className={`inline-block w-3.5 h-3.5 rounded-full animate-spin border-2 border-accent-primary/20 border-t-accent-primary [animation-duration:0.7s] ${className ?? ""}`}
    />
  );
}
