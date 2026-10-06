import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export type CheckboxAccent = "primary" | "success" | "error";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "checked"
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  accent?: CheckboxAccent;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  maxLength?: number;
  required?: boolean;
  rows?: number;
}

export interface FieldControlProps extends Omit<FieldProps, "label" | "error"> {
  inputType: string;
  controlClass: string;
}

export interface PagerProps {
  page: number;
  pages: number;
  onGoto: (page: number) => void;
  label?: string;
  className?: string;
}

export interface CursorPagerProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
  className?: string;
}

export interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  label?: string;
}
