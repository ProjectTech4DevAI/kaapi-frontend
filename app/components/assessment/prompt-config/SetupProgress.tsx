import { MAX_CONFIGS } from "@/app/lib/types/assessment";

interface StatusPillProps {
  label: string;
  value: string;
}

interface SetupProgressProps {
  promptStatus: string;
  selectedConfigCount: number;
  responseSummary: string;
}

function StatusPill({ label, value }: StatusPillProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary">
      {label}: {value}
    </span>
  );
}

export default function SetupProgress({
  promptStatus,
  selectedConfigCount,
  responseSummary,
}: SetupProgressProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill label="Prompt" value={promptStatus} />
      <StatusPill
        label="Behaviors"
        value={`${selectedConfigCount}/${MAX_CONFIGS}`}
      />
      <StatusPill label="Output" value={responseSummary} />
    </div>
  );
}
