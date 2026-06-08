import { useState } from "react";
import { guardrailsFetch } from "@/app/lib/guardrailsClient";
import { useAuth } from "@/app/lib/context/AuthContext";
import { Button, Field, Modal } from "@/app/components/ui";

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
        validator_name: "topic_relevance",
        name: name.trim(),
        description: description.trim(),
        llm_prompt: configuration.trim(),
        prompt_schema_version: promptSchemaVersion,
      };
      const data = await guardrailsFetch<{ id: string; name?: string }>(
        "/api/guardrails/llm_prompt_configs",
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
    <Modal
      open
      onClose={onClose}
      title="Create Topic Relevance Config"
      maxWidth="max-w-md"
    >
      <div className="px-6 pb-2">
        <p className="text-xs text-text-secondary mb-4">
          Define a topic relevance configuration for output validation.
        </p>

        <div className="space-y-4">
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
              Topic relevance Configuration *
            </label>
            <textarea
              value={configuration}
              onChange={(e) => setConfiguration(e.target.value)}
              placeholder="Enter the topic configuration prompt or schema…"
              rows={4}
              className={`${textareaClass} ${configError ? "border-status-error-border" : ""}`}
            />
            {configError && (
              <p className="text-xs text-status-error-text mt-1">
                {configError}
              </p>
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
      </div>

      <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleCreate} disabled={isSaving}>
          {isSaving ? "Creating…" : "Create"}
        </Button>
      </div>
    </Modal>
  );
}
