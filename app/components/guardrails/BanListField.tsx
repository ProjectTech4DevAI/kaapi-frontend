import React, { useEffect, useState } from "react";
import BanListModal from "./BanListModal";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Select } from "@/app/components/ui";

interface BanList {
  id: string;
  name: string;
}

interface BanListFieldProps {
  value: string | null;
  onChange: (id: string | null) => void;
}

export default function BanListField({ value, onChange }: BanListFieldProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [banLists, setBanLists] = useState<BanList[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [wordsLoading, setWordsLoading] = useState(false);
  const [wordsError, setWordsError] = useState<string | null>(null);

  const fetchBanLists = () => {
    setLoading(true);
    setFetchError(null);

    guardrailsFetch<{
      data?: { ban_lists?: BanList[] } | BanList[];
      ban_lists?: BanList[];
    }>("/api/guardrails/ban_lists", apiKey)
      .then((data) => {
        const nested = data?.data;
        const list: BanList[] = Array.isArray(
          (nested as { ban_lists?: BanList[] })?.ban_lists,
        )
          ? (nested as { ban_lists: BanList[] }).ban_lists
          : Array.isArray(nested)
            ? (nested as BanList[])
            : Array.isArray(data?.ban_lists)
              ? data.ban_lists!
              : [];
        setBanLists(list);
      })
      .catch((e: Error) =>
        setFetchError(e.message || "Failed to load ban lists"),
      )
      .finally(() => setLoading(false));
  };

  const fetchBannedWords = (id: string) => {
    setWordsLoading(true);
    setBannedWords([]);
    setWordsError(null);

    guardrailsFetch<{
      banned_words?: string[];
      data?: { banned_words?: string[] };
    }>(`/api/guardrails/ban_lists/${id}`, apiKey)
      .then((data) => {
        const words: string[] = Array.isArray(data?.banned_words)
          ? data.banned_words!
          : Array.isArray(data?.data?.banned_words)
            ? data.data!.banned_words!
            : [];
        setBannedWords(words);
      })
      .catch((e: Error) =>
        setWordsError(e.message || "Failed to load banned words"),
      )
      .finally(() => setWordsLoading(false));
  };

  useEffect(() => {
    fetchBanLists();
  }, []);

  useEffect(() => {
    if (value) {
      fetchBannedWords(value);
    } else {
      setBannedWords([]);
    }
  }, [value]);

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
          <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-border border-t-accent-primary animate-spin" />
          <span>Loading ban lists…</span>
        </div>
      );
    }
    const placeholderLabel =
      banLists.length === 0 ? "No ban lists yet" : "Select a ban list…";
    const options = [
      { value: "", label: placeholderLabel },
      ...banLists.map((bl) => ({ value: bl.id, label: bl.name })),
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
          title="Create a new ban list"
        >
          + New
        </button>
      </div>
    );
  }

  function renderBannedWords() {
    if (!value) return null;
    if (wordsLoading) {
      return (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <p className="text-xs text-text-secondary flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-border border-t-accent-primary animate-spin" />
            Loading banned words…
          </p>
          <div className="flex flex-wrap gap-1">
            {[14, 22, 18, 26, 16, 20, 24].map((w, i) => (
              <span
                key={i}
                className="inline-block h-5 rounded-full bg-bg-secondary animate-pulse"
                style={{ width: `${w * 4}px` }}
              />
            ))}
          </div>
        </div>
      );
    }
    if (wordsError) {
      return (
        <p className="text-xs px-3 py-2 rounded-md bg-status-error-bg border border-status-error-border text-status-error-text">
          {wordsError}
        </p>
      );
    }
    if (bannedWords.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {bannedWords.map((word) => (
            <span
              key={word}
              className="inline-block text-xs px-2 py-0.5 rounded-full bg-status-success-bg text-status-success-text border border-status-success-border"
            >
              {word}
            </span>
          ))}
        </div>
      );
    }
    return (
      <p className="text-xs text-text-secondary">No words in this ban list.</p>
    );
  }

  return (
    <>
      <div>
        <label className="block text-xs font-medium mb-1 text-text-primary">
          Ban List
        </label>
        {renderSelect()}
        {value && <div className="mt-2">{renderBannedWords()}</div>}
      </div>

      {showModal && (
        <BanListModal
          onClose={() => setShowModal(false)}
          onCreated={(bl) => {
            setShowModal(false);
            fetchBanLists();
            onChange(bl.id);
          }}
        />
      )}
    </>
  );
}
