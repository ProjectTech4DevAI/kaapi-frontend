import React, { useEffect, useState } from "react";
import BanListModal from "./BanListModal";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import Select from "@/app/components/ui/Select";

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
      ...(banLists.length === 0
        ? [{ value: "", label: "No ban lists yet" }]
        : [{ value: "", label: "Select a ban list…" }]),
      { value: "__create__", label: "+ Create Ban List" },
      ...banLists.map((bl) => ({ value: bl.id, label: bl.name })),
    ];
    return (
      <Select value={value ?? ""} onChange={handleChange} options={options} />
    );
  }

  function renderBannedWords() {
    if (!value) return null;
    if (wordsLoading) {
      return <div className="h-6 rounded animate-pulse bg-bg-secondary" />;
    }
    if (wordsError) {
      return (
        <p className="text-xs px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600">
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
              className="inline-block text-xs px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary"
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
