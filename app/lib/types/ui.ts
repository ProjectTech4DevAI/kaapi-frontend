import { InputHTMLAttributes, ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /**
   * Optional group label. When any option in a `<Select>` declares a group,
   * the select renders `<optgroup>` blocks. Options without a group fall
   * into an untitled top-level bucket.
   */
  group?: string;
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
