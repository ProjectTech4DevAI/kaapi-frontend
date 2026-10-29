import { ReactNode } from "react";
import { InfoTooltip } from "@/app/components/ui";

interface NodeFieldLabelProps {
  label: string;
  hint: string;
  children?: ReactNode;
}

export default function NodeFieldLabel({
  label,
  hint,
  children,
}: NodeFieldLabelProps) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
      <InfoTooltip text={hint} />
    </div>
  );
}
