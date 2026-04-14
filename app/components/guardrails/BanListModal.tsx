import { useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import Button from "@/app/components/Button";
import { CloseIcon } from "@/app/components/icons";
import Field from "@/app/components/Field";

interface BanListModalProps {
  onClose: () => void;
  onCreated: (banList: { id: string; name: string }) => void;
}

export default function BanListModal({
  onClose,
  onCreated,
}: BanListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [domain, setDomain] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [wordsError, setWordsError] = useState("");

  const handleCreate = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError("Name is required");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!bannedWords.trim()) {
      setWordsError("At least one banned word is required");
      hasError = true;
    } else {
      setWordsError("");
    }
    if (hasError) return;

    try {
      setIsSaving(true);
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
      const data = await guardrailsFetch<{ id: string; name?: string }>(
        "/api/guardrails/ban_lists",
        { method: "POST", body: JSON.stringify(body) },
      );
      onCreated({ id: data.id, name: data.name ?? name.trim() });
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSaving(false);
    }
  };

  const textareaClass =
    "w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-1 resize-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl shadow-xl flex flex-col bg-bg-primary border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Create Ban List
            </h2>
            <p className="text-xs mt-0.5 text-text-secondary">
              Define a list of words to ban from outputs
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-100 transition-colors text-text-secondary"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <Field
            label="Name *"
            value={name}
            onChange={setName}
            placeholder="e.g. profanity-list"
            error={nameError}
          />

          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this ban list covers…"
              rows={2}
              className={textareaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Banned Words *
              <span className="ml-1 font-normal">(comma-separated)</span>
            </label>
            <textarea
              value={bannedWords}
              onChange={(e) => setBannedWords(e.target.value)}
              placeholder="word1, word2, word3"
              rows={3}
              className={`${textareaClass} ${wordsError ? "border-red-400" : ""}`}
            />
            {wordsError && (
              <p className="text-xs text-red-500 mt-1">{wordsError}</p>
            )}
          </div>

          <Field
            label="Domain"
            value={domain}
            onChange={setDomain}
            placeholder="e.g. healthcare, finance"
          />

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-text-primary">
              Make this ban list public
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isSaving}>
            {isSaving ? "Creating…" : "Create Ban List"}
          </Button>
        </div>
      </div>
    </div>
  );
}
