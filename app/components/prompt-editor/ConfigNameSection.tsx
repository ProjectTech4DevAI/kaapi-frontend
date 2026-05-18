"use client";

import { useState } from "react";
import { Button, Field } from "@/app/components/ui";
import { EditIcon } from "@/app/components/icons";
import { ConfigPublic } from "@/app/lib/types/configs";

interface ConfigNameSectionProps {
  configName: string;
  onConfigNameChange: (name: string) => void;
  boundConfigId?: string;
  onRenameConfig?: (configId: string, newName: string) => Promise<boolean>;
  allConfigMeta: ConfigPublic[];
}

export default function ConfigNameSection({
  configName,
  onConfigNameChange,
  boundConfigId,
  onRenameConfig,
  allConfigMeta,
}: ConfigNameSectionProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [isApplyingRename, setIsApplyingRename] = useState(false);

  const isBound = !!boundConfigId;

  const existingConfigForHint = configName.trim()
    ? allConfigMeta.find((m) => m.name === configName.trim())
    : undefined;

  const handleStartRename = () => {
    setRenameDraft(configName);
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setRenameDraft("");
  };

  const handleApplyRename = async () => {
    if (!boundConfigId || !onRenameConfig) return;
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed === configName) {
      handleCancelRename();
      return;
    }
    setIsApplyingRename(true);
    const ok = await onRenameConfig(boundConfigId, trimmed);
    setIsApplyingRename(false);
    if (ok) {
      setIsRenaming(false);
      setRenameDraft("");
    }
  };

  if (isBound && !isRenaming) {
    return (
      <div>
        <label className="block text-xs font-medium text-text-secondary mb-1">
          Configuration Name
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg-secondary text-text-primary text-sm truncate">
            {configName || "Untitled"}
          </div>
          <button
            type="button"
            onClick={handleStartRename}
            className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-lg text-text-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-colors cursor-pointer"
            title="Rename this configuration (does not create a new version)"
            aria-label="Rename configuration"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (isBound && isRenaming) {
    return (
      <div className="space-y-2">
        <Field
          label="New Configuration Name"
          value={renameDraft}
          onChange={setRenameDraft}
          placeholder="New name"
          autoFocus
          disabled={isApplyingRename}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleApplyRename}
            disabled={
              isApplyingRename ||
              !renameDraft.trim() ||
              renameDraft.trim() === configName
            }
          >
            {isApplyingRename ? "Renaming…" : "Apply rename"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelRename}
            disabled={isApplyingRename}
          >
            Cancel
          </Button>
        </div>
        <p className="text-xs text-text-secondary">
          ✏️ Renames the configuration metadata only — no new version is
          created.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Field
        label="Configuration Name *"
        value={configName}
        onChange={onConfigNameChange}
        placeholder="e.g., my-config"
      />
      {configName.trim() && (
        <p
          className="text-xs mt-1.5 text-text-secondary truncate"
          title={
            existingConfigForHint
              ? `Will create a new version for "${configName}"`
              : `Will create a new config "${configName}"`
          }
        >
          {existingConfigForHint
            ? `💡 Will create a new version for "${configName}"`
            : `✨ Will create a new config "${configName}"`}
        </p>
      )}
    </div>
  );
}
