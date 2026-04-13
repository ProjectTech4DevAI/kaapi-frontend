import { CheckIcon } from "@/app/components/icons";

interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

export default function StepIndicator({
  number,
  label,
  active,
  completed,
}: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
          completed
            ? "bg-green-600 text-white"
            : active
              ? "bg-accent-primary text-white"
              : "bg-neutral-200 text-text-secondary"
        }`}
      >
        {completed ? <CheckIcon className="w-3.5 h-3.5" /> : number}
      </div>
      <span
        className={`text-sm font-medium ${
          active || completed ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
