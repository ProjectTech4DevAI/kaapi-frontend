import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, { base: string; disabled: string }> =
  {
    primary: {
      base: "bg-accent-primary text-white hover:bg-accent-hover",
      disabled: "bg-neutral-200 text-text-secondary cursor-not-allowed",
    },
    outline: {
      base: "bg-white text-text-primary border border-border hover:bg-neutral-50",
      disabled:
        "bg-white text-text-secondary border border-border cursor-not-allowed opacity-50",
    },
    ghost: {
      base: "bg-transparent text-text-secondary hover:bg-neutral-100 hover:text-text-primary",
      disabled:
        "bg-transparent text-text-secondary cursor-not-allowed opacity-50",
    },
    danger: {
      base: "bg-red-600 text-white hover:bg-red-700",
      disabled: "bg-neutral-200 text-text-secondary cursor-not-allowed",
    },
  };

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <button
      disabled={disabled}
      className={`rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${
        sizeStyles[size]
      } ${disabled ? styles.disabled : styles.base} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
