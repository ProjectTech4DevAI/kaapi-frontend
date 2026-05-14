import React, { useEffect, useState } from "react";
import TopicRelevanceModal from "./TopicRelevanceModal";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import Select from "@/app/components/Select";

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
    if (e.target.value === "__create__") {
      setShowModal(true);
    } else {
      onChange(e.target.value || null);
    }
  };

  function renderSelect() {
    if (fetchError) {
      return (
        <p className="text-xs px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600">
          {fetchError}
        </p>
      );
    }
    if (loading) {
      return <div className="h-8 rounded-md animate-pulse bg-bg-secondary" />;
    }
    const options = [
      ...(configs.length === 0
        ? [{ value: "", label: "No configs yet" }]
        : [{ value: "", label: "Select a topic relevance config…" }]),
      { value: "__create__", label: "+ Create Topic Relevance Config" },
      ...configs.map((c) => ({ value: c.id, label: c.name })),
    ];
    return (
      <Select value={value ?? ""} onChange={handleChange} options={options} />
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
