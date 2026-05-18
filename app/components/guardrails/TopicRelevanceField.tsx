import React, { useEffect, useState } from "react";
import TopicRelevanceModal from "./TopicRelevanceModal";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Loader, Select } from "@/app/components/ui";

interface TopicRelevanceConfig {
  id: string;
  name: string;
}

interface TopicRelevanceFieldProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function TopicRelevanceField({
  value,
  onChange,
}: TopicRelevanceFieldProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [configs, setConfigs] = useState<TopicRelevanceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchConfigs = () => {
    setLoading(true);
    setFetchError(null);

    guardrailsFetch<{
      data?:
        | { topic_relevance_configs?: TopicRelevanceConfig[] }
        | TopicRelevanceConfig[];
      topic_relevance_configs?: TopicRelevanceConfig[];
    }>("/api/guardrails/topic_relevance_configs", apiKey)
      .then((data) => {
        const nested = data?.data;
        const list: TopicRelevanceConfig[] = Array.isArray(
          (nested as { topic_relevance_configs?: TopicRelevanceConfig[] })
            ?.topic_relevance_configs,
        )
          ? (
              nested as {
                topic_relevance_configs: TopicRelevanceConfig[];
              }
            ).topic_relevance_configs
          : Array.isArray(nested)
            ? (nested as TopicRelevanceConfig[])
            : Array.isArray(data?.topic_relevance_configs)
              ? data.topic_relevance_configs!
              : [];
        setConfigs(list);
      })
      .catch((e: Error) =>
        setFetchError(e.message || "Failed to load topic relevance configs"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfigs();
  }, [apiKey]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value || null);
  };

  function renderSelect() {
    if (fetchError) {
      return (
        <p className="text-xs px-3 py-2 rounded-md bg-status-error-bg border border-status-error-border text-status-error-text">
          {fetchError}
        </p>
      );
    }
    if (loading) {
      return (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-sm text-text-secondary"
          role="status"
          aria-live="polite"
        >
          <Loader size="sm" />
          <span>Loading topic relevance configs…</span>
        </div>
      );
    }
    const placeholderLabel =
      configs.length === 0
        ? "No configs yet"
        : "Select a topic relevance config…";
    const options = [
      { value: "", label: placeholderLabel },
      ...configs.map((c) => ({ value: c.id, label: c.name })),
    ];
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <Select
            value={value ?? ""}
            onChange={handleChange}
            options={options}
          />
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-accent-primary bg-accent-primary/5 hover:bg-accent-primary/10 transition-colors cursor-pointer"
          title="Create a new topic relevance config"
        >
          + New
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1 text-text-primary">
          Topic Relevance Config
        </label>
        {renderSelect()}
      </div>

      {showModal && (
        <TopicRelevanceModal
          onClose={() => setShowModal(false)}
          onCreated={(cfg) => {
            setShowModal(false);
            fetchConfigs();
            onChange(cfg.id);
          }}
        />
      )}
    </>
  );
}
