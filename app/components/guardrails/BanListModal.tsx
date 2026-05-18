import { useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Button, Field, Modal } from "@/app/components/ui";

interface BanListModalProps {
  onClose: () => void;
  onCreated: (banList: { id: string; name: string }) => void;
}

export default function BanListModal({
  onClose,
  onCreated,
}: BanListModalProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
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
        apiKey,
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
    <Modal open onClose={onClose} title="Create Ban List" maxWidth="max-w-md">
      <div className="px-6 pb-2">
        <p className="text-xs text-text-secondary mb-4">
          Define a list of words to ban from outputs.
        </p>

        <div className="space-y-4">
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
              className={`${textareaClass} ${wordsError ? "border-status-error-border" : ""}`}
            />
            {wordsError && (
              <p className="text-xs text-status-error-text mt-1">
                {wordsError}
              </p>
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
      </div>

      <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreate} disabled={isSaving}>
          {isSaving ? "Creating…" : "Create Ban List"}
        </Button>
      </div>
    </Modal>
  );
}
