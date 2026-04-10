import { useState } from "react";
import { colors } from "@/app/lib/colors";

interface BanListModalProps {
  onClose: () => void;
  onCreated: (banList: { id: string; name: string }) => void;
  apiKey: string;
}

export default function BanListModal({
  onClose,
  onCreated,
  apiKey,
}: BanListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [domain, setDomain] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!bannedWords.trim()) {
      setError("At least one banned word is required");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        banned_words: bannedWords
          .split(",")
          .map((w) => w.trim())
          .filter(Boolean),
        domain: domain.trim(),
        is_public: isPublic,
      };
      const res = await fetch("/api/guardrails/ban_lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Failed to create ban list");
      }
      const data = await res.json();
      onCreated({ id: data.id, name: data.name ?? name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl shadow-xl flex flex-col"
        style={{
          backgroundColor: colors.bg.primary,
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <div>
            <h2
              className="text-sm font-semibold"
              style={{ color: colors.text.primary }}
            >
              Create Ban List
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: colors.text.secondary }}
            >
              Define a list of words to ban from outputs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: colors.text.secondary }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <p className="text-xs px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600">
              {error}
            </p>
          )}

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. profanity-list"
              className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this ban list covers…"
              rows={2}
              className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1 resize-none"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              Banned Words <span className="text-red-500">*</span>
              <span
                className="ml-1 font-normal"
                style={{ color: colors.text.secondary }}
              >
                (comma-separated)
              </span>
            </label>
            <textarea
              value={bannedWords}
              onChange={(e) => setBannedWords(e.target.value)}
              placeholder="word1, word2, word3"
              rows={3}
              className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1 resize-none"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: colors.text.primary }}
            >
              Domain
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="e.g. healthcare, finance"
              className="w-full text-sm rounded-md border px-2.5 py-1.5 outline-none focus:ring-1"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg.primary,
                color: colors.text.primary,
              }}
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: colors.text.primary }}>
              Make this ban list public
            </span>
          </label>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: colors.border }}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border transition-colors hover:bg-neutral-50"
            style={{ borderColor: colors.border, color: colors.text.primary }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving}
            className="px-4 py-1.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: colors.accent.primary, color: "#ffffff" }}
          >
            {isSaving ? "Creating…" : "Create Ban List"}
          </button>
        </div>
      </div>
    </div>
  );
}
