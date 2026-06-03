"use client";

import { SelectHTMLAttributes } from "react";
import { SelectOption } from "@/app/lib/types/ui";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

export default function Select({
  options,
  placeholder,
  ...props
}: SelectProps) {
  const isGrouped = options.some((o) => o.group !== undefined);

  const groups: { label: string | null; options: SelectOption[] }[] = [];
  if (isGrouped) {
    const seen = new Map<string | null, SelectOption[]>();
    for (const opt of options) {
      const key = opt.group ?? null;
      if (!seen.has(key)) {
        const bucket: SelectOption[] = [];
        seen.set(key, bucket);
        groups.push({ label: key, options: bucket });
      }
      seen.get(key)!.push(opt);
    }
  }

  return (
    <select
      className="w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-accent-primary/20 focus:border-accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {isGrouped
        ? groups.map((g, i) =>
            g.label ? (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              g.options.map((opt) => (
                <option key={`${i}-${opt.value}`} value={opt.value}>
                  {opt.label}
                </option>
              ))
            ),
          )
        : options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
    </select>
  );
}
