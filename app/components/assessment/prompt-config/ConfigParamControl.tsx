import Select from "@/app/components/Select";
import type { ConfigParamDefinition } from "@/app/lib/types/assessment";

const selectClass =
  "w-full rounded-xl border border-border bg-bg-primary px-4 py-3 text-sm text-text-primary outline-none focus:ring-1";

interface ConfigParamControlProps {
  value: string | number;
  definition: ConfigParamDefinition;
  onChange: (value: string | number) => void;
}

export default function ConfigParamControl({
  value,
  definition,
  onChange,
}: ConfigParamControlProps) {
  if (definition.type === "enum" && definition.options) {
    return (
      <Select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        options={definition.options.map((option) => ({
          value: option,
          label: option,
        }))}
      />
    );
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={definition.min ?? 0}
        max={definition.max ?? 2}
        step={definition.type === "int" ? 1 : 0.01}
        value={numericValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1"
      />
      <span className="w-12 text-right font-mono text-sm text-text-primary">
        {definition.type === "int" ? numericValue : numericValue.toFixed(2)}
      </span>
    </div>
  );
}
