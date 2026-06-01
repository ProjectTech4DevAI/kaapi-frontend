import React, { useEffect, useRef, useState } from "react";
import TopicRelevanceModal from "./TopicRelevanceModal";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Loader, Select } from "@/app/components/ui";
import {
  TopicRelevanceConfig,
  TopicRelevanceConfigDetails,
  TopicRelevanceFieldProps,
} from "@/app/lib/types/guardrails";

const DESC_MIN_PX = 44;
const DESC_MAX_PX = 240;
const CONFIG_MIN_PX = 100;
const CONFIG_MAX_PX = 380;

export default function TopicRelevanceField({
  value,
  onChange,
  disabled = false,
}: TopicRelevanceFieldProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [configs, setConfigs] = useState<TopicRelevanceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [details, setDetails] = useState<TopicRelevanceConfigDetails | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const configRef = useRef<HTMLTextAreaElement>(null);

  const autoSize = (
    el: HTMLTextAreaElement | null,
    minPx: number,
    maxPx: number,
  ) => {
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(Math.max(el.scrollHeight, minPx), maxPx);
    el.style.height = `${next}px`;
  };

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

  useEffect(() => {
    if (!disabled || !value) return;
    autoSize(descRef.current, DESC_MIN_PX, DESC_MAX_PX);
    autoSize(configRef.current, CONFIG_MIN_PX, CONFIG_MAX_PX);
  }, [
    disabled,
    value,
    detailsLoading,
    details?.description,
    details?.configuration,
  ]);

  useEffect(() => {
    if (!disabled || !value) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setDetailsLoading(true);
    guardrailsFetch<{
      data?: TopicRelevanceConfigDetails;
      description?: string | null;
      configuration?: string | null;
    }>(`/api/guardrails/topic_relevance_configs/${value}`, apiKey)
      .then((d) => {
        if (cancelled) return;
        const entity = d?.data ?? d;
        setDetails({
          description: entity?.description ?? null,
          configuration: entity?.configuration ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setDetails(null);
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [disabled, value, apiKey]);

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
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-accent-primary bg-accent-primary/5 hover:bg-accent-primary/10 transition-colors cursor-pointer"
            title="Create a new topic relevance config"
          >
            + New
          </button>
        )}
      </div>
    );
  }

  const textareaReadOnlyClass =
    "w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none resize-none";

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Topic Relevance Config
        </label>
        {renderSelect()}

        {disabled && value && (
          <div className="mt-4 space-y-3">
            {(detailsLoading || (details?.description ?? "").trim() !== "") && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Description
                </label>
                <textarea
                  ref={descRef}
                  value={
                    detailsLoading ? "Loading…" : (details?.description ?? "")
                  }
                  disabled
                  rows={2}
                  className={`${textareaReadOnlyClass} overflow-hidden`}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Topic relevance Configuration
              </label>
              <textarea
                ref={configRef}
                value={
                  detailsLoading ? "Loading…" : (details?.configuration ?? "")
                }
                disabled
                rows={4}
                className={`${textareaReadOnlyClass} font-mono text-[12.5px] overflow-auto`}
              />
            </div>
          </div>
        )}
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
