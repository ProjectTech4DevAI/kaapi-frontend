import { useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import Button from "@/app/components/Button";
import { CloseIcon } from "@/app/components/icons";
import Field from "@/app/components/Field";

interface TopicRelevanceModalProps {
  onClose: () => void;
  onCreated: (topicRelevance: { id: string; name: string }) => void;
}

export default function TopicRelevanceModal({
  onClose,
  onCreated,
}: TopicRelevanceModalProps) {
  const { activeKey } = useAuth();
  const apiKey = activeKey?.key ?? "";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [promptSchemaVersion, setPromptSchemaVersion] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [configError, setConfigError] = useState("");

  const handleCreate = async () => {
    let hasError = false;
    if (!name.trim()) {
      setNameError("Name is required");
      hasError = true;
    } else {
      setNameError("");
    }
    if (!configuration.trim()) {
      setConfigError("Configuration is required");
      hasError = true;
    } else {
      setConfigError("");
    }
    if (hasError) return;

    try {
      setIsSaving(true);
      const body = {
        name: name.trim(),
        description: description.trim(),
        configuration: configuration.trim(),
        prompt_schema_version: promptSchemaVersion,
      };
      const data = await guardrailsFetch<{ id: string; name?: string }>(
        "/api/guardrails/topic_relevance_configs",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-xl shadow-xl flex flex-col bg-bg-primary border border-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              Create Topic Relevance Config
            </h2>
            <p className="text-xs mt-0.5 text-text-secondary">
              Define a topic relevance configuration for output validation
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
            placeholder="e.g. medical-topics"
            error={nameError}
          />

          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this topic relevance config covers…"
              rows={2}
              className={textareaClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Configuration *
            </label>
            <textarea
              value={configuration}
              onChange={(e) => setConfiguration(e.target.value)}
              placeholder="Enter the topic configuration prompt or schema…"
              rows={4}
              className={`${textareaClass} ${configError ? "border-red-400" : ""}`}
            />
            {configError && (
              <p className="text-xs text-red-500 mt-1">{configError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-text-secondary">
              Prompt Schema Version *
            </label>
            <input
              type="number"
              min={1}
              value={promptSchemaVersion}
              onChange={(e) =>
                setPromptSchemaVersion(
                  Math.max(1, parseInt(e.target.value, 10) || 1),
                )
              }
              className="w-full text-sm rounded-md border border-border bg-bg-primary text-text-primary px-2.5 py-1.5 outline-none focus:ring-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={isSaving}>
            {isSaving ? "Creating…" : "Create Topic Relevance Config"}
          </Button>
        </div>
      </div>
    </div>
  );
}
