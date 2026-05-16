import { useEffect, useMemo, useState } from "react";
import MultiSelect from "@/app/components/ui/MultiSelect";
import { GuardrailRef } from "@/app/lib/types/configs";

interface ValidatorConfigOption {
  id: string;
  name: string;
  type: string;
  stage?: string;
}

interface GuardrailsSectionProps {
  label: string;
  guardrails: GuardrailRef[];
  onChange: (refs: GuardrailRef[]) => void;
  apiKey: string;
  queryString: string | null;
  stage: "input" | "output";
}

export default function GuardrailsSection({
  label,
  guardrails,
  onChange,
  apiKey,
  queryString,
  stage,
}: GuardrailsSectionProps) {
  const [validators, setValidators] = useState<ValidatorConfigOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValidators([]);
    if (!queryString) return;
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/guardrails/validators/configs${queryString}`, {
      headers: apiKey ? { "X-API-KEY": apiKey } : {},
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        const items: ValidatorConfigOption[] = Array.isArray(
          data?.data?.configs,
        )
          ? data.data.configs
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data?.configs)
              ? data.configs
              : Array.isArray(data)
                ? data
                : [];
        setValidators(items);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setValidators([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [queryString, apiKey]);

  const stageValidators = useMemo(
    () => validators.filter((v) => !v.stage || v.stage === stage),
    [validators, stage],
  );

  const options = useMemo(
    () =>
      stageValidators.map((v) => ({
        value: v.id,
        label: v.name || v.type,
      })),
    [stageValidators],
  );

  const selectedIds = guardrails.map((g) => g.validator_config_id);

  const handleChange = (ids: string[]) => {
    onChange(ids.map((id) => ({ validator_config_id: id })));
  };

  const placeholder = loading
    ? "Loading validators…"
    : stageValidators.length === 0
      ? "No validators available"
      : "Select validators…";

  return (
    <div>
      <label className="block text-xs font-semibold mb-2 text-text-primary">
        {label}
      </label>
      <MultiSelect
        options={options}
        value={selectedIds}
        onChange={handleChange}
        placeholder={placeholder}
      />
    </div>
  );
}
