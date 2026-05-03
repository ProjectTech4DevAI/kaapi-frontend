import {
  MAX_CONFIGS,
  type SetupProgressProps,
  type StatusPillProps,
} from "@/app/lib/types/assessment";

function StatusPill({ label, value }: StatusPillProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--background)",
        color: "var(--muted)",
      }}
    >
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
