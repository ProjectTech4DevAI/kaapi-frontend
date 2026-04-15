import { useEffect, useState } from "react";
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
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  const addedIds = new Set(guardrails.map((g) => g.validator_config_id));
  const available = validators.filter(
    (v) => !addedIds.has(v.id) && (!v.stage || v.stage === stage),
  );
  const addDisabled = loading || available.length === 0;

  const handleAdd = (id: string) => {
    onChange([...guardrails, { validator_config_id: id }]);
    setDropdownOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(guardrails.filter((g) => g.validator_config_id !== id));
  };

  const getValidatorName = (id: string) => {
    const v = validators.find(
      (v) => v.id === id && (!v.stage || v.stage === stage),
    );
    return v ? v.name || v.type : id.slice(0, 8) + "…";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-text-primary">
          {label}
        </label>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            disabled={addDisabled}
            className={`px-2 py-1 rounded text-xs font-medium ${
              addDisabled
                ? "bg-bg-secondary text-text-secondary cursor-not-allowed"
                : "bg-accent-primary text-bg-primary cursor-pointer"
            }`}
          >
            {loading
              ? "Loading…"
              : available.length === 0
                ? "No validators"
                : "+ Add"}
          </button>
          {dropdownOpen && available.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-1 w-56 rounded-md shadow-lg max-h-48 overflow-auto bg-bg-primary border border-border">
                {available.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleAdd(v.id)}
                    className="w-full px-3 py-2 text-left text-sm transition-colors text-text-primary bg-transparent hover:bg-bg-secondary"
                  >
                    {v.name || v.type}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {guardrails.length === 0 ? (
        <p className="text-xs text-text-secondary">No validators added</p>
      ) : (
        <div className="space-y-1">
          {guardrails.map((g) => (
            <div
              key={g.validator_config_id}
              className="flex items-center justify-between px-2.5 py-1.5 rounded bg-bg-secondary border border-border"
            >
              <span className="text-xs truncate text-text-primary">
                {getValidatorName(g.validator_config_id)}
              </span>
              <button
                onClick={() => handleRemove(g.validator_config_id)}
                className="ml-2 text-xs shrink-0 text-status-error bg-transparent border-0 cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
